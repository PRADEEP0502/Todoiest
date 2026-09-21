import { SlidersHorizontal } from 'lucide-react';
import { useMemo } from 'react';
import {
  CATEGORIES,
  DATE_CHECKS,
  describeCategory,
  describeDateCheck,
  type CategoryBasis,
  type DateCheckId,
  type DateCheckRule,
  type MetricRules,
} from '../../lib/metrics';
import { useWorkspace } from '../../store/workspace';
import { IconBadge } from '../common/ui';
import { SearchSelect } from '../common/SearchSelect';

const BASES: { value: CategoryBasis; label: string; hint: string }[] = [
  { value: 'days-overdue', label: 'Days overdue (from due dates)', hint: 'A-5 = 1–5 days late, A-10 = 6–10, A-30 = 11–30, A30+ = over 30.' },
  { value: 'labels', label: 'Todoist labels', hint: 'A task is in a category when it carries the label you map below.' },
  { value: 'sections', label: 'Todoist section names', hint: 'A task is in a category when its section has the name you map below.' },
];

const CHECK_KINDS: { value: DateCheckRule['kind']; label: string; needsValue: boolean }[] = [
  { value: 'unset', label: 'Not set up (hide the count)', needsValue: false },
  { value: 'no-cd', label: 'Tasks with no creation date (DD.MM.YY, …)', needsValue: false },
  { value: 'no-idd', label: 'Tasks with no initial due date (…, DD.MM.YY)', needsValue: false },
  { value: 'without-label', label: 'Tasks WITHOUT a label…', needsValue: true },
  { value: 'with-label', label: 'Tasks WITH a label…', needsValue: true },
  { value: 'in-section', label: 'Tasks in a section named…', needsValue: true },
  { value: 'no-deadline', label: 'Tasks without a Todoist deadline', needsValue: false },
  { value: 'description-missing', label: 'Description does not mention…', needsValue: true },
];

/**
 * The dashboard does not assume what A-5…A30+ or "No CD" / "No IDD" mean. This card lets the
 * owner map them to real Todoist data: due dates, labels, sections, deadlines or descriptions.
 */
export function MetricRulesCard() {
  const { settings, setRules, snapshot } = useWorkspace();
  const rules = settings.rules;
  const update = (patch: Partial<MetricRules>) => setRules({ ...rules, ...patch });

  const labelNames = useMemo(() => [...new Set([...(snapshot?.labels.map((l) => l.name) ?? []), ...(snapshot?.tasks.flatMap((t) => t.labels) ?? [])])].sort(), [snapshot]);
  const sectionNames = useMemo(() => [...new Set(snapshot?.sections.map((s) => s.name) ?? [])].sort(), [snapshot]);
  const suggestions = rules.categoryBasis === 'labels' ? labelNames : sectionNames;

  const setCheck = (id: DateCheckId, kind: DateCheckRule['kind'], value?: string) => {
    const needsValue = CHECK_KINDS.find((k) => k.value === kind)!.needsValue;
    const previous = rules[id];
    const keep = 'value' in previous ? previous.value : '';
    update({ [id]: needsValue ? { kind, value: value ?? keep } : { kind } } as Partial<MetricRules>);
  };

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
        <IconBadge icon={<SlidersHorizontal />} tone="warn" />
        Metric rules
      </h2>
      <p className="mb-4 mt-0.5 text-[12.5px] text-ink-3">How the dashboard counts overdue categories and date checks from your Todoist data.</p>

      <datalist id="rule-suggestions">
        {suggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="label-suggestions">
        {labelNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <datalist id="section-suggestions">
        {sectionNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="category-basis">A-5 / A-10 / A-30 / A30+ are based on</label>
          <SearchSelect
            id="category-basis"
            className="w-full max-w-sm"
            value={rules.categoryBasis}
            onChange={(v) => update({ categoryBasis: v as CategoryBasis })}
            options={BASES.map((b) => ({ value: b.value, label: b.label }))}
          />
          <p className="mt-1 text-[12px] text-ink-3">{BASES.find((b) => b.value === rules.categoryBasis)!.hint}</p>
        </div>

        {rules.categoryBasis !== 'days-overdue' && (
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <div key={c.id}>
                <label className="label" htmlFor={`cat-${c.id}`}>
                  {c.label} = {rules.categoryBasis === 'labels' ? 'label' : 'section'}
                </label>
                <input
                  id={`cat-${c.id}`}
                  className="field"
                  list="rule-suggestions"
                  value={rules.categoryNames[c.id]}
                  onChange={(e) => update({ categoryNames: { ...rules.categoryNames, [c.id]: e.target.value } })}
                />
                <p className="mt-0.5 text-2xs text-ink-3">{describeCategory(c.id, rules)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          {DATE_CHECKS.map(({ id, label }) => {
            const rule = rules[id];
            const kind = CHECK_KINDS.find((k) => k.value === rule.kind)!;
            return (
              <div key={id}>
                <label className="label" htmlFor={`check-${id}`}>“{label}” counts</label>
                <SearchSelect
                  id={`check-${id}`}
                  value={rule.kind}
                  onChange={(v) => setCheck(id, v as DateCheckRule['kind'])}
                  options={CHECK_KINDS.map((k) => ({ value: k.value, label: k.label }))}
                />
                {kind.needsValue && (
                  <input
                    className="field mt-1.5"
                    list={rule.kind === 'in-section' ? 'section-suggestions' : rule.kind === 'description-missing' ? undefined : 'label-suggestions'}
                    placeholder={rule.kind === 'in-section' ? 'Section name' : rule.kind === 'description-missing' ? 'Text, e.g. CD:' : 'Label name'}
                    value={'value' in rule ? rule.value : ''}
                    onChange={(e) => setCheck(id, rule.kind, e.target.value)}
                    aria-label={`${label} value`}
                  />
                )}
                <p className="mt-1 text-[12px] text-ink-3">{describeDateCheck(rule)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

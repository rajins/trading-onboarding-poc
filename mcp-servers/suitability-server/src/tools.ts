import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';

const RULES_BASE = process.env.RULES_PATH || path.resolve(process.cwd(), '../../rules');
const rulesCache = new Map<string, ReturnType<typeof JSON.parse>>();

function getSuitabilityRules(product: string) {
  const key = product.toLowerCase();
  if (!rulesCache.has(key)) {
    rulesCache.set(key, JSON.parse(readFileSync(path.join(RULES_BASE, 'uk', 'suitability', `${key}.json`), 'utf-8')));
  }
  return rulesCache.get(key);
}

export const suitabilityTools = {
  get_appropriateness_questions: {
    description: 'Get the appropriateness test questions for a product that requires it.',
    inputSchema: z.object({ product_code: z.string() }),
    handler: (input: { product_code: string }) => {
      const rules = getSuitabilityRules(input.product_code);
      if (!rules.questions) return { required: false, product_code: input.product_code };
      return { required: true, product_code: input.product_code, questions: rules.questions, rules_version: rules.version, fca_rule_reference: rules.fca_rule_reference };
    },
  },
  run_appropriateness_test: {
    description: 'Evaluate answers to appropriateness test questions. Returns PASS or FAIL deterministically.',
    inputSchema: z.object({ product_code: z.string(), answers: z.record(z.string()).describe('Map of question_id to answer value') }),
    handler: (input: { product_code: string; answers: Record<string, string> }) => {
      const rules = getSuitabilityRules(input.product_code);
      if (!rules.questions) return { decision: 'PASS', reason: 'No appropriateness test required', rule_version: rules.version };
      let totalScore = 0;
      const breakdown: Array<{ question_id: string; answer: string; score: number }> = [];
      for (const question of rules.questions) {
        const answer = input.answers[question.id];
        const option = question.options.find((o: { value: string }) => o.value === answer);
        const score = option?.score ?? 0;
        totalScore += score;
        breakdown.push({ question_id: question.id, answer: answer || 'not_answered', score });
      }
      const passed = totalScore >= rules.scoring.pass_threshold;
      return {
        decision: passed ? 'PASS' : 'FAIL',
        score: totalScore,
        pass_threshold: rules.scoring.pass_threshold,
        maximum_score: rules.scoring.maximum_score,
        breakdown,
        failure_disclosure: passed ? null : rules.mandatory_disclosure_on_fail,
        retest_waiting_period_days: passed ? null : (rules.retest_waiting_period_days || null),
        rule_version: rules.version,
      };
    },
  },
  check_retest_period: {
    description: 'Check if a customer is within the waiting period before retaking an appropriateness test.',
    inputSchema: z.object({ product_code: z.string(), last_failed_at: z.string().describe('ISO 8601 datetime') }),
    handler: (input: { product_code: string; last_failed_at: string }) => {
      const rules = getSuitabilityRules(input.product_code);
      const waitingDays = rules.retest_waiting_period_days || 30;
      const lastFailed = new Date(input.last_failed_at);
      const daysSince = Math.floor((Date.now() - lastFailed.getTime()) / (1000 * 60 * 60 * 24));
      const canRetest = daysSince >= waitingDays;
      return {
        can_retest: canRetest,
        days_since_last_failure: daysSince,
        waiting_period_days: waitingDays,
        eligible_from: canRetest ? 'now' : new Date(lastFailed.getTime() + waitingDays * 24 * 60 * 60 * 1000).toISOString(),
      };
    },
  },
};

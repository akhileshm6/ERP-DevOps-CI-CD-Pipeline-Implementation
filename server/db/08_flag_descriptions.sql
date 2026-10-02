-- 08_flag_descriptions.sql — make the seeded flag descriptions say what the
-- flags actually do. Only `description` changes; each flag's state, rollout
-- and targeting are left exactly as an Admin last set them.

UPDATE feature_flags
   SET description = 'Shows the Finance category chart to the targeted roles. Turn it off and the chart is hidden on the next page load.'
 WHERE key = 'new-finance-chart';

UPDATE feature_flags
   SET description = 'Demonstration flag with no UI effect yet; use it to try role targeting and rollout percentages.'
 WHERE key = 'beta-dashboard';

UPDATE feature_flags
   SET description = 'Retired flag kept off to show a disabled entry; no feature reads it.'
 WHERE key = 'legacy-export';

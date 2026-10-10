#!/usr/bin/env bash
# Additive-migration safety check — Vivek, Week 8.
# Boots the previous release and the current one against ONE migrated
# database and asserts both serve traffic and both SQL shapes still work.
# Usage: docker compose up -d, then  bash scripts/migration-safety-check.sh
# Expects erp-old on :5010 and erp-new on :5011 (see docs/MIGRATION_SAFETY.md).
pass=0; fail=0
chk() { # label, expected, actual
  if [ "$2" = "$3" ]; then echo "  PASS  $1 (got $3)"; pass=$((pass+1));
  else echo "  FAIL  $1 (expected $2, got $3)"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' -m 10 "$@" || echo 000; }

echo "=== A. Both app versions serve traffic against the migrated schema ==="
chk "OLD /health"  200 "$(code http://localhost:5010/health)"
chk "NEW /health"  200 "$(code http://localhost:5011/health)"
chk "OLD /ready"   200 "$(code http://localhost:5010/ready)"
chk "NEW /ready"   200 "$(code http://localhost:5011/ready)"

echo ""
echo "=== B. Auth round-trip on BOTH versions (tokens must interoperate) ==="
reg() { curl -s -m 10 -X POST "$1/api/auth/register" -H 'Content-Type: application/json' \
        -d '{"name":"Rollback Tester","email":"rb@test.local","password":"pw123456","role":"Admin"}' >/dev/null; }
tok() { curl -s -m 10 -X POST "$1/api/auth/login" -H 'Content-Type: application/json' \
        -d '{"email":"rb@test.local","password":"pw123456"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
reg http://localhost:5010; reg http://localhost:5011
TOLD=$(tok http://localhost:5010); TNEW=$(tok http://localhost:5011)
[ -n "$TOLD" ] && echo "  PASS  OLD issued a JWT" && pass=$((pass+1)) || { echo "  FAIL  OLD issued no JWT"; fail=$((fail+1)); }
[ -n "$TNEW" ] && echo "  PASS  NEW issued a JWT" && pass=$((pass+1)) || { echo "  FAIL  NEW issued no JWT"; fail=$((fail+1)); }

echo ""
echo "  --- cross-version token acceptance (what a mid-rollback user hits) ---"
chk "OLD token -> NEW instance" 200 "$(code -H "Authorization: Bearer $TOLD" http://localhost:5011/api/admin/dashboard)"
chk "NEW token -> OLD instance" 200 "$(code -H "Authorization: Bearer $TNEW" http://localhost:5010/api/admin/dashboard)"

echo ""
echo "=== C. Old-shape SQL still valid against the new schema ==="
q() { docker exec erp-db psql -U erp_user -d erp_db -tAc "$1" >/dev/null 2>&1 && echo OK || echo ERR; }
chk "pre-migration users SELECT"      OK "$(q 'SELECT id,name,email,password,role,created_at FROM users LIMIT 1;')"
OLDINS="INSERT INTO users(name,email,password,role) SELECT 'Old Writer','old@test.local','x','Employee' WHERE NOT EXISTS (SELECT 1 FROM users WHERE email='old@test.local');"
chk "pre-migration users INSERT"      OK "$(q "$OLDINS")"
chk "pre-migration employees SELECT"  OK "$(q 'SELECT id,user_id,department_id,job_title,salary,hire_date FROM employees LIMIT 1;')"
chk "pre-migration inventory_items"   OK "$(q 'SELECT id,sku,name,quantity,min_stock_level,unit_price FROM inventory_items LIMIT 1;')"
chk "pre-migration audit_logs"        OK "$(q 'SELECT id,user_id,action,module,timestamp FROM audit_logs LIMIT 1;')"

echo ""
echo "=== D. New-shape SQL works on the same schema ==="
chk "new users columns"    OK "$(q 'SELECT password_hash,is_active FROM users LIMIT 1;')"
chk "contract sales"       OK "$(q 'SELECT id,order_date,product_id,quantity,amount,region FROM sales LIMIT 1;')"
chk "contract inventory"   OK "$(q 'SELECT id,sku,product_name,warehouse,quantity,reorder_level FROM inventory LIMIT 1;')"
chk "contract finance"     OK "$(q 'SELECT id,entry_date,category,type,amount FROM finance_entries LIMIT 1;')"
chk "contract deployments" OK "$(q 'SELECT id,version,image_tag,commit_sha,environment,status,triggered_by,trigger_type,started_at,completed_at,duration_seconds,test_summary FROM deployments LIMIT 1;')"
chk "contract flags"       OK "$(q 'SELECT id,key,description,enabled,rollout_percent,target_roles,environment,updated_by FROM feature_flags LIMIT 1;')"

echo ""
echo "=== E. Old version writes; new version must read the same row ==="
docker exec erp-db psql -U erp_user -d erp_db -tAc \
  "INSERT INTO users(name,email,password,role) VALUES('Mid Rollback','mid@test.local','legacy','Manager') ON CONFLICT (email) DO NOTHING;" >/dev/null 2>&1
GOT=$(docker exec erp-db psql -U erp_user -d erp_db -tAc \
  "SELECT name||'|'||role||'|is_active='||is_active FROM users WHERE email='mid@test.local';" 2>/dev/null | tr -d '\r')
chk "row written old-shape, read new-shape" "Mid Rollback|Manager|is_active=true" "$GOT"

echo ""
echo "================= RESULT: $pass passed, $fail failed ================="
[ "$fail" -eq 0 ] || exit 1

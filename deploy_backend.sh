#!/bin/bash
set -e
cd /home/ubuntu/project/backend

echo "=== Skipping pip install - existing venv has all deps (no new imports added) ==="
echo ""

echo "=== Verify imports work ==="
./venv/bin/python -c 'from app.main import app; print("OK: imports clean. Routes:", len(app.routes))'

echo ""
echo "=== Alembic stamp + upgrade ==="
CURRENT=$(./venv/bin/python -m alembic current 2>/dev/null | grep -oE '[0-9a-f]{12}' | head -1 || true)
echo "Current revision: '$CURRENT'"
if [ -z "$CURRENT" ]; then
  echo "Not stamped. Stamping baseline 7420d3775007..."
  ./venv/bin/python -m alembic stamp 7420d3775007
fi
./venv/bin/python -m alembic upgrade head
echo "After upgrade:"
./venv/bin/python -m alembic current

echo ""
echo "=== Verify schema (visitors.phone column) ==="
./venv/bin/python << 'PYEOF'
import sqlite3
con = sqlite3.connect('namyah.db')
cols = [r[1] for r in con.execute('PRAGMA table_info(visitors)').fetchall()]
print('visitors columns:', cols)
assert 'phone' in cols, 'phone column missing!'
idx = [r[1] for r in con.execute('PRAGMA index_list(visitors)').fetchall()]
print('visitors indexes:', idx)
print('OK: phone column present.')
PYEOF

echo ""
echo "=== Restart backend service ==="
sudo systemctl restart metaads-backend.service
sleep 3
sudo systemctl status metaads-backend.service --no-pager | head -20

echo ""
echo "=== Smoke test API ==="
sleep 1
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:8000/ || true
curl -s http://127.0.0.1:8000/api/auth/me | head -c 200
echo ""
echo ""

echo "=== Backend deploy DONE. Frontend next. ==="

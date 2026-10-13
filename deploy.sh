#!/bin/bash
set -e
cd /home/ubuntu/project

echo "=== [1/8] Backing up DB ==="
cp backend/namyah.db backend/namyah.db.bak.predeploy_$(date +%Y%m%d_%H%M%S)
ls -la backend/namyah.db*

echo "=== [2/8] Extracting new code ==="
tar -xzf /home/ubuntu/deploy.tar.gz -C /home/ubuntu/project
echo "Extracted. Files updated."

echo "=== [3/8] Verify new migration present ==="
ls backend/alembic/versions/

echo "=== [4/8] Pip install (idempotent) ==="
cd /home/ubuntu/project/backend
./venv/bin/pip install -q -r requirements.txt

echo "=== [5/8] Alembic stamp + upgrade ==="
CURRENT=$(./venv/bin/python -m alembic current 2>/dev/null | grep -oE '[0-9a-f]{12}' | head -1 || true)
echo "Current revision: '$CURRENT'"
if [ -z "$CURRENT" ]; then
  echo "Not stamped. Stamping baseline 7420d3775007..."
  ./venv/bin/python -m alembic stamp 7420d3775007
fi
./venv/bin/python -m alembic upgrade head
echo "After upgrade:"
./venv/bin/python -m alembic current

echo "=== [6/8] Verify schema (visitors.phone column) ==="
./venv/bin/python -c "
import sqlite3
con = sqlite3.connect('namyah.db')
cols = [r[1] for r in con.execute('PRAGMA table_info(visitors)').fetchall()]
print('visitors columns:', cols)
assert 'phone' in cols, 'phone column missing!'
print('OK: phone column present.')
"

echo "=== [7/8] Restart backend service ==="
sudo systemctl restart metaads-backend.service
sleep 2
sudo systemctl status metaads-backend.service --no-pager | head -15

echo "=== [8/8] Building frontend ==="
cd /home/ubuntu/project
npm ci --silent
npm run build
echo "Frontend build complete."
ls -la dist/

echo "=== Reloading nginx ==="
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="

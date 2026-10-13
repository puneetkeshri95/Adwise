#!/bin/bash
set -e
cd /home/ubuntu/project

echo "=== Backup old dist ==="
if [ -d dist ]; then
  mv dist dist.bak.predeploy
fi

echo "=== Extracting new dist ==="
tar -xzf /home/ubuntu/frontend.tar.gz -C /home/ubuntu/project
ls -la dist/ dist/assets/ | head -20

echo "=== Test nginx config ==="
sudo nginx -t

echo "=== Reload nginx ==="
sudo systemctl reload nginx

echo "=== Smoke test public endpoints ==="
curl -s -o /dev/null -w "https smartbudget.qzz.io/: HTTP %{http_code}\n" https://smartbudget.qzz.io/
curl -s -o /dev/null -w "https smartbudget.qzz.io/api/pixel/namyah.js: HTTP %{http_code}\n" https://smartbudget.qzz.io/api/pixel/namyah.js
curl -s https://smartbudget.qzz.io/ | head -c 300
echo ""
echo "=== DONE ==="

echo ""
echo "Cleaning up tarballs..."
rm -f /home/ubuntu/deploy.tar.gz /home/ubuntu/frontend.tar.gz
echo "Done."

#!/bin/bash
# Test push notification — usage : ./test-push.sh "<JWT_ANON_KEY>"

KEY="${1:-}"
if [ -z "$KEY" ]; then
  echo "Usage: ./_test-push.sh <JWT_ANON_KEY>"
  echo ""
  echo "Récupère le JWT sur Supabase Dashboard → Settings → API → 'anon public' key"
  echo "(commence par eyJhbGci...)"
  exit 1
fi

CLIENT_ID="5f5cb37c-728b-47a9-b7ae-43d3aa643d65"
URL="https://pwkajyrpldhlybavmopd.supabase.co/functions/v1/send-push"

echo "Sending push to client_id=$CLIENT_ID..."
echo ""

curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "apikey: $KEY" \
  -H "Authorization: Bearer $KEY" \
  -d "{\"client_id\":\"$CLIENT_ID\",\"title\":\"Test push\",\"body\":\"VAPID OK\",\"url\":\"/\"}"

echo ""

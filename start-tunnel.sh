#!/bin/bash

# Start localhost.run tunnel (no signup required)

echo "🚀 Starting localhost.run tunnel..."
echo ""
echo "This will create a public URL for your app"
echo "No signup or token required!"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

ssh -R 80:localhost:3000 nokey@localhost.run

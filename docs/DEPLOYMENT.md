# Gateway XPAY Deployment

Target VPS directory: `/var/www/Xpay`

1. Sync the repository to the VPS.
2. Run `npm install --omit=dev`.
3. Create `/var/www/Xpay/.env.local` from `.env.example`.
4. Install `deploy/gatewayxpay.service` to `/etc/systemd/system/gatewayxpay.service`.
5. Install `deploy/gatewayxpay.nginx.conf` to `/etc/nginx/sites-available/gatewayxpay.com`.
6. Enable the service and Nginx site.
7. Issue TLS for `gatewayxpay.com` after DNS points to the VPS.

The email app password must stay only in `.env.local` on the server.

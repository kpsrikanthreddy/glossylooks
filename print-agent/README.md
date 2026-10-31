# The Glossy Looks - Salon Desktop Print Agent

This daemon service runs on the salon's reception computer (Windows / macOS / Linux) or POS terminal. It connects via local USB or network drivers to thermal receipt printers (e.g., Epson TM-T82, TVS RP-3160, Star Micronics) and regular A4 printers.

## Architecture (MOZZ Print Agent Model)
1. **Device Registration**: The agent registers its unique hardware `PRINT_DEVICE_ID` with the salon backend.
2. **Heartbeat**: Sends periodic heartbeats (`/api/print-devices/heartbeat`) so the admin dashboard shows printer connection health.
3. **Queue Polling**: Long-polls or polls `/api/print-jobs/pending?device_id=...` for new print jobs.
4. **Auto-Printing**: 
   - When a receptionist finalizes an order or marks POS payment, the backend instantly dispatches a `bill` print job.
   - When an appointment is confirmed, an optional `service_ticket` slip is queued for the stylist station.
5. **Driver Pipeline**: In production, the payload is converted into raw ESC/POS commands or sent via OS printer spooler (`lp`, `node-printer`, or `escpos` library).

## Setup Steps
1. Navigate to the agent folder:
   ```bash
   cd print-agent
   npm install
   ```
2. Configure environment variables in `.env` or system environment:
   ```env
   SALON_SERVER_URL=http://localhost:3000
   PRINT_DEVICE_ID=POS-COUNTER-01
   PRINT_DEVICE_NAME=Reception Main Counter 80mm
   PRINTER_NAME=EPSON-TM-T82-Thermal
   PRINTER_TYPE=thermal
   POLL_INTERVAL_MS=2000
   ```
3. Run the agent:
   ```bash
   npm start
   ```
4. Verify in The Glossy Looks Admin Panel -> **Print Devices** tab: the device status will turn **Online** with real-time heartbeat.

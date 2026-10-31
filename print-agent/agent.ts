/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * The Glossy Looks - Salon Desktop Thermal Print Agent
 * Inspired by the MOZZ print-agent architecture for local USB/Network POS printers.
 * 
 * This background agent runs on the salon reception desktop PC or tablet.
 * It connects to The Glossy Looks Salon Management Server, registers the local device,
 * maintains heartbeats, and polls for pending Print Jobs (bills & service tickets).
 */

interface PrintJob {
  id: string;
  job_type: 'bill' | 'service_ticket';
  order_id?: string;
  appointment_id?: string;
  status: 'Pending' | 'Printing' | 'Printed' | 'Failed' | 'Retried';
  payload: {
    bill_number?: string;
    booking_reference?: string;
    customer_name: string;
    customer_phone: string;
    items?: Array<{ name: string; quantity: number; price: number; staff?: string }>;
    services?: Array<{ name: string; duration: number; staff?: string; price: number }>;
    subtotal?: number;
    discount?: number;
    tax?: number;
    total?: number;
    payment_method?: string;
    payment_status?: string;
    time_slot?: string;
    date?: string;
    assigned_staff?: string;
    salon_name?: string;
    salon_address?: string;
    salon_phone?: string;
  };
  created_at: string;
}

class SalonPrintAgent {
  private serverUrl: string;
  private deviceId: string;
  private deviceName: string;
  private printerName: string;
  private printerType: 'thermal' | 'a4';
  private pollIntervalMs: number;
  private heartbeatIntervalMs: number;
  private isRunning: boolean = false;

  constructor() {
    this.serverUrl = process.env.SALON_SERVER_URL || 'http://localhost:3000';
    this.deviceId = process.env.PRINT_DEVICE_ID || 'POS-COUNTER-01';
    this.deviceName = process.env.PRINT_DEVICE_NAME || 'Reception Main Counter 80mm';
    this.printerName = process.env.PRINTER_NAME || 'EPSON-TM-T82-Thermal';
    this.printerType = (process.env.PRINTER_TYPE as 'thermal' | 'a4') || 'thermal';
    this.pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || '3000', 10);
    this.heartbeatIntervalMs = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '15000', 10);
  }

  public async start() {
    console.log('========================================================');
    console.log(' ✨ The Glossy Looks - Desktop Print Agent Starting ✨ ');
    console.log(` Server:       ${this.serverUrl}`);
    console.log(` Device ID:    ${this.deviceId}`);
    console.log(` Device Name:  ${this.deviceName}`);
    console.log(` Printer Name: ${this.printerName} (${this.printerType.toUpperCase()})`);
    console.log('========================================================');

    this.isRunning = true;
    await this.registerDevice();

    // Start periodic heartbeat
    setInterval(() => {
      if (this.isRunning) this.sendHeartbeat();
    }, this.heartbeatIntervalMs);

    // Start polling loop
    this.pollLoop();
  }

  private async registerDevice() {
    try {
      const response = await fetch(`${this.serverUrl}/api/print-devices/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: this.deviceId,
          device_name: this.deviceName,
          printer_name: this.printerName,
          printer_type: this.printerType,
          branch: '31, Vinayak Nagar, Gachibowli, Hyderabad'
        })
      });
      const data = await response.json();
      console.log(`[OK] Print Agent registered with Salon Server:`, data);
    } catch (err) {
      console.error(`[WARN] Could not register print agent (server might be starting up):`, (err as Error).message);
    }
  }

  private async sendHeartbeat() {
    try {
      await fetch(`${this.serverUrl}/api/print-devices/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: this.deviceId })
      });
    } catch (err) {
      console.error(`[HEARTBEAT ERROR]:`, (err as Error).message);
    }
  }

  private async pollLoop() {
    while (this.isRunning) {
      try {
        await this.checkAndProcessQueue();
      } catch (err) {
        console.error(`[POLL ERROR]:`, (err as Error).message);
      }
      await new Promise(res => setTimeout(res, this.pollIntervalMs));
    }
  }

  private async checkAndProcessQueue() {
    const res = await fetch(`${this.serverUrl}/api/print-jobs/pending?device_id=${this.deviceId}`);
    if (!res.ok) return;

    const jobs: PrintJob[] = await res.json();
    if (!jobs || jobs.length === 0) return;

    for (const job of jobs) {
      await this.processJob(job);
    }
  }

  private async processJob(job: PrintJob) {
    console.log(`\n🖨️ [PRINT JOB RECEIVED] ID: ${job.id} | Type: ${job.job_type.toUpperCase()}`);

    // Update status to Printing
    await this.updateJobStatus(job.id, 'Printing');

    try {
      if (job.job_type === 'bill') {
        this.printThermalBill(job.payload);
      } else {
        this.printServiceTicket(job.payload);
      }

      // Mark Printed
      await this.updateJobStatus(job.id, 'Printed');
      console.log(`✅ [PRINT JOB FINISHED] Successfully printed job ${job.id}`);
    } catch (err) {
      console.error(`❌ [PRINT JOB FAILED]:`, (err as Error).message);
      await this.updateJobStatus(job.id, 'Failed');
    }
  }

  private async updateJobStatus(jobId: string, status: string) {
    try {
      await fetch(`${this.serverUrl}/api/print-jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error(`Failed to update job status:`, err);
    }
  }

  private printThermalBill(data: PrintJob['payload']) {
    const divider = '------------------------------------------';
    const doubleDivider = '==========================================';

    console.log(doubleDivider);
    console.log('             THE GLOSSY LOOKS             ');
    console.log('         Professional Women Salon         ');
    console.log('  31, Vinayak Nagar, Gachibowli, Hyderabad');
    console.log('             Ph: +91 9848012345           ');
    console.log(divider);
    console.log(`BILL NO: ${data.bill_number || 'N/A'}`);
    console.log(`DATE:    ${data.date || new Date().toLocaleString()}`);
    console.log(`CLIENT:  ${data.customer_name} (${data.customer_phone})`);
    console.log(divider);
    console.log('ITEM / SERVICE                   QTY  AMOUNT(₹)');
    console.log(divider);

    if (data.items) {
      for (const item of data.items) {
        const name = item.name.padEnd(30, ' ').substring(0, 30);
        const qty = item.quantity.toString().padStart(3, ' ');
        const amt = item.price.toFixed(2).padStart(8, ' ');
        console.log(`${name} ${qty} ${amt}`);
        if (item.staff) {
          console.log(`  └ By Stylist: ${item.staff}`);
        }
      }
    }

    console.log(divider);
    console.log(`SUBTOTAL:                      ₹${(data.subtotal || 0).toFixed(2)}`);
    if (data.discount) console.log(`DISCOUNT:                     -₹${data.discount.toFixed(2)}`);
    if (data.tax) console.log(`GST (5%):                      ₹${data.tax.toFixed(2)}`);
    console.log(doubleDivider);
    console.log(`GRAND TOTAL:                   ₹${(data.total || 0).toFixed(2)}`);
    console.log(`PAYMENT: ${data.payment_method || 'UPI'} (${data.payment_status || 'Paid'})`);
    console.log(divider);
    console.log('       Thank You for Visiting Us!         ');
    console.log('  Follow our Glam Journey on Instagram!   ');
    console.log(doubleDivider + '\n');
  }

  private printServiceTicket(data: PrintJob['payload']) {
    const divider = '------------------------------------------';
    console.log(divider);
    console.log('      THE GLOSSY LOOKS - SERVICE SLIP     ');
    console.log(`SLIP REF: ${data.booking_reference || 'N/A'}`);
    console.log(`TIME:     ${data.date} at ${data.time_slot}`);
    console.log(`CLIENT:   ${data.customer_name} (${data.customer_phone})`);
    console.log(`STYLIST:  ${data.assigned_staff || 'Station Assigned'}`);
    console.log(divider);
    console.log('SCHEDULED SERVICES:');
    if (data.services) {
      data.services.forEach((s, idx) => {
        console.log(` ${idx + 1}. ${s.name} (${s.duration} mins)`);
      });
    }
    console.log(divider + '\n');
  }
}

// Auto start if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new SalonPrintAgent();
  agent.start();
}

export default SalonPrintAgent;

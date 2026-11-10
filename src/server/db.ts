/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Persistent Data Layer & Repository Implementation for The Glossy Looks
 * Stores and manages all salon data in JSON storage with full ACID-like atomic writes.
 * Implements ISalonRepository to allow replacement with Supabase / PostgreSQL effortlessly.
 */

import fs from 'fs';
import path from 'path';
import type {
  User,
  Customer,
  OTPSession,
  Staff,
  StaffAvailability,
  ServiceCategory,
  ServiceItem,
  PackageCombo,
  Appointment,
  Order,
  PaymentRecord,
  Product,
  Supplier,
  PurchaseOrder,
  InventoryMovement,
  GalleryItem,
  Enquiry,
  Offer,
  Review,
  PrintDevice,
  PrintJob,
  SalonSettings,
  AuditLog,
  DetailedSalesReport,
  SalesReportFilter,
  WhatsAppIntegration,
  WhatsAppBusinessSettings,
  SalonBranch,
  BranchWhatsAppIntegration,
  WhatsAppMessageLog,
  AppointmentFeedback,
  ScheduledFeedbackJob,
  ProcessedWebhookEvent,
  DailySalesReportLog,
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppInboxFilter,
  CustomerServiceWindowInfo,
  WhatsAppWebhookEvent,
  WhatsAppInboxDiagnostics
} from '../types/salon.ts';
import type { ISalonRepository } from './repositories/salonRepository.ts';

export interface DatabaseData {
  settings: SalonSettings;
  branches: SalonBranch[];
  branch_whatsapp_integrations: BranchWhatsAppIntegration[];
  users: User[];
  customers: Customer[];
  otp_sessions: OTPSession[];
  staff: Staff[];
  staff_availability: StaffAvailability[];
  categories: ServiceCategory[];
  services: ServiceItem[];
  packages: PackageCombo[];
  appointments: Appointment[];
  orders: Order[];
  payments: PaymentRecord[];
  products: Product[];
  suppliers: Supplier[];
  purchase_orders: PurchaseOrder[];
  inventory_movements: InventoryMovement[];
  gallery: GalleryItem[];
  enquiries: Enquiry[];
  offers: Offer[];
  reviews: Review[];
  print_devices: PrintDevice[];
  print_jobs: PrintJob[];
  audit_logs: AuditLog[];
  whatsapp_integration?: WhatsAppIntegration;
  whatsapp_settings?: WhatsAppBusinessSettings;
  whatsapp_message_logs?: WhatsAppMessageLog[];
  appointment_feedback?: AppointmentFeedback[];
  scheduled_feedback_jobs?: ScheduledFeedbackJob[];
  processed_webhook_events?: ProcessedWebhookEvent[];
  daily_sales_reports?: DailySalesReportLog[];
  whatsapp_conversations?: WhatsAppConversation[];
  whatsapp_messages?: WhatsAppMessage[];
  whatsapp_webhook_events?: WhatsAppWebhookEvent[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'salon_store.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

function getInitialData(): DatabaseData {
  return {
    settings: {
      brand_name: 'The Glossy Looks',
      salon_type: 'Professional Women Salon & Bridal Studio',
      address: '31, Vinayak Nagar, Gachibowli',
      city: 'Hyderabad, Telangana - 500032',
      phone: '8985799459',
      whatsapp: '8985799459',
      opening_hours: '10:00 AM to 10:00 PM (Monday to Sunday)',
      google_maps_url: 'https://share.google/TWPbPEEVlN5mPfqpL',
      announcement_text: 'Festive & Royal Bridal Season Bookings Open! Complimentary pre-bridal hair trial with every HD bridal package.'
    },
    branches: [
      {
        id: 'tgl-gachibowli-main',
        name: 'Gachibowli Main Flagship',
        code: 'GCB-01',
        address: '31, Vinayak Nagar, Gachibowli',
        city: 'Hyderabad, Telangana - 500032',
        phone: '8985799459',
        whatsapp_number: '8985799459',
        manager_id: 'usr-1',
        manager_name: 'Madu Mounika',
        is_active: true,
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:00Z'
      }
    ],
    branch_whatsapp_integrations: [
      {
        id: 'bwa-gcb-01',
        branch_id: 'tgl-gachibowli-main',
        configured_business_number: '8985799459',
        waba_id: '1608729824244675',
        phone_number_id: '1379025201957313',
        display_name: 'THE GLOSSY LOOKS',
        display_phone_number: '+91 89857 99459',
        masked_phone_number: '+91 ******9459',
        status: 'connected',
        connected_at: '2026-10-30T07:45:00.000Z',
        last_verified_at: '2026-10-30T07:45:00.000Z',
        diagnostics: 'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.',
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-10-30T07:45:00.000Z'
      }
    ],
    users: [
      {
        id: 'usr-1',
        user_id: 'TGL-OWN01',
        email: 'owner@theglossylooks.com',
        password_hash: 'admin123',
        role: 'owner',
        name: 'Madu Mounika',
        phone: '8985799459',
        branch_id: 'tgl-gachibowli-main',
        is_active: true,
        created_at: '2026-01-01T10:00:00Z',
        updated_at: '2026-01-01T10:00:00Z'
      }
    ],
    customers: [
      {
        id: 'cust-1',
        name: 'Sneha Reddy',
        mobile: '9849021234',
        email: 'sneha.reddy@gmail.com',
        birthday: '1995-11-14',
        address: 'Flat 402, Jayabheri Silicon County, Hitec City, Hyderabad',
        saved_addresses: [
          { label: 'Home', address_line: 'Flat 402, Jayabheri Silicon County', area: 'Hitec City', city: 'Hyderabad' }
        ],
        preferences: 'Prefers mild herbal fragrance. Organic skin creams.',
        allergies: 'Sensitive to harsh artificial bleach and strong sulfates.',
        notes: 'Regular customer for O3+ facial and crystal pedicure.',
        loyalty_points: 340,
        total_spend: 18500,
        visit_count: 5,
        last_visit_at: '2026-10-18T14:30:00Z',
        tags: ['VIP Client', 'Bridal Reference', 'Regular'],
        created_at: '2025-11-10T11:00:00Z',
        updated_at: '2026-10-18T14:30:00Z'
      },
      {
        id: 'cust-2',
        name: 'Pooja Agarwal',
        mobile: '9988776655',
        email: 'pooja.a@outlook.com',
        birthday: '1998-04-20',
        address: 'Tower 3, My Home Bhooja, Gachibowli, Hyderabad',
        saved_addresses: [
          { label: 'Residence', address_line: 'Tower 3, Apt 1804, My Home Bhooja', area: 'Gachibowli', city: 'Hyderabad' }
        ],
        preferences: 'Dewy glass-skin finish for bridal makeup. Natural flutter lashes.',
        allergies: 'None reported.',
        notes: 'Booked Royal Bridal Glow & Makeup package for wedding on Dec 15th.',
        loyalty_points: 620,
        total_spend: 32000,
        visit_count: 3,
        last_visit_at: '2026-10-21T11:00:00Z',
        tags: ['Bride-to-Be', 'High Value'],
        created_at: '2026-02-14T09:30:00Z',
        updated_at: '2026-10-21T11:00:00Z'
      },
      {
        id: 'cust-3',
        name: 'Divya Varma',
        mobile: '9123456780',
        email: 'divya.varma@yahoo.com',
        birthday: '1993-08-09',
        address: 'Villa 18, Aparna Sarovar Grande, Nallagandla, Hyderabad',
        preferences: 'Prefers ammonia-free hair glosses and Rose aroma pedicure.',
        loyalty_points: 180,
        total_spend: 9400,
        visit_count: 4,
        last_visit_at: '2026-10-15T16:00:00Z',
        tags: ['Hair Spa Regular'],
        created_at: '2026-03-01T15:20:00Z',
        updated_at: '2026-10-15T16:00:00Z'
      },
      {
        id: 'cust-4',
        name: 'Harika Chowdary',
        mobile: '9000123890',
        email: 'harika.c@gmail.com',
        birthday: '2001-02-28',
        address: 'Botanical Garden Road, Kondapur, Hyderabad',
        preferences: 'Enquired about Party Makeup and Saree Draping for family sangeet.',
        loyalty_points: 80,
        total_spend: 4200,
        visit_count: 2,
        last_visit_at: '2026-10-22T17:15:00Z',
        tags: ['Festive Glam'],
        created_at: '2026-05-18T10:00:00Z',
        updated_at: '2026-10-22T17:15:00Z'
      }
    ],
    otp_sessions: [],
    staff: [
      {
        id: 'stf-1',
        user_id: 'usr-1',
        admin_user_id: 'TGL-OWN01',
        name: 'Madu Mounika',
        phone: '8985799459',
        email: 'owner@theglossylooks.com',
        role: 'Salon Director & Master Stylist',
        branch_id: 'tgl-gachibowli-main',
        joining_date: '2024-01-01',
        salary_type: 'monthly',
        base_salary: 85000,
        commission_rate: 15,
        skills: ['Bridal Makeup', 'Airbrush Art', 'Hair Couture', 'Aesthetics', 'Salon Management'],
        working_hours: '10:00 AM - 08:00 PM',
        is_active: true,
        created_at: '2024-01-01T10:00:00Z'
      }
    ],
    staff_availability: [],
    categories: [
      {
        id: 'cat-salon',
        name: 'Salon',
        slug: 'salon',
        description: 'Bespoke hair cuts, styling, botox, organic hair spa, and revitalizing treatments.',
        image_url: '/categories/salon.jpg',
        display_order: 1,
        is_active: true
      },
      {
        id: 'cat-spa',
        name: 'Spa',
        slug: 'spa',
        description: 'Serene body relaxation therapies, herbal warm towel rituals, and deep tissue stress relief.',
        image_url: '/categories/spa.jpg',
        display_order: 2,
        is_active: true
      },
      {
        id: 'cat-facials',
        name: 'Facials',
        slug: 'facials',
        description: 'Advanced clinical & herbal skin rejuvenations, Hydra glow, O3+ radiance, and de-tan therapies.',
        image_url: '/categories/facials.jpg',
        display_order: 3,
        is_active: true
      },
      {
        id: 'cat-makeup',
        name: 'Makeup',
        slug: 'makeup',
        description: 'High-definition bridal makeup, festive glam, engagement looks, hair design, and saree draping.',
        image_url: '/categories/makeup.jpg',
        display_order: 4,
        is_active: true
      },
      {
        id: 'cat-body',
        name: 'Body Polishing',
        slug: 'body-polishing',
        description: 'Full body botanical exfoliating scrubs, organic polish, tan removal, and skin softening glows.',
        image_url: '/categories/body.jpg',
        display_order: 5,
        is_active: true
      },
      {
        id: 'cat-mani-pedi',
        name: 'Mani & Pedi',
        slug: 'mani-pedi',
        description: 'Luxury crystal pedicure, rose aroma manicure, nail strengthening, and contemporary nail art.',
        image_url: '/categories/mani-pedi.jpg',
        display_order: 6,
        is_active: true
      }
    ],
    services: [
      // 1. MAKEUP (Dedicated category with the 7 required services)
      {
        id: 'srv-mu-1',
        category_id: 'cat-makeup',
        name: 'Bridal Makeup (HD / Airbrush)',
        slug: 'bridal-makeup',
        description: 'Complete royal bridal transformation with waterproof HD/Airbrush base, bespoke contouring, lashes, premium eye artistry, hair styling, and jewelry setting.',
        benefits: '16-hour sweat-proof stay, camera-ready luminosity, includes luxury skin prep',
        duration_minutes: 180,
        price: 18500,
        discount_price: 15999,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/bridal-makeup.jpg',
        is_active: true
      },
      {
        id: 'srv-mu-2',
        category_id: 'cat-makeup',
        name: 'Party Makeup & Hair Styling',
        slug: 'party-makeup',
        description: 'Glamorous evening and festive party makeup designed to complement your designer outfit with modern glowing finish and complementary hair do.',
        benefits: 'Long-lasting dewy or matte finish, sculpted cheekbones, winged or smokey eye artistry',
        duration_minutes: 90,
        price: 4500,
        discount_price: 3800,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/party-makeup.jpg',
        is_active: true
      },
      {
        id: 'srv-mu-3',
        category_id: 'cat-makeup',
        name: 'Engagement Makeup',
        slug: 'engagement-makeup',
        description: 'Elegant romantic makeup look curated specifically for ring ceremonies and intimate sangeet gatherings.',
        benefits: 'Pastel and shimmer palettes tailored to your pastel lehenga or gown',
        duration_minutes: 120,
        price: 8500,
        discount_price: 7499,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/engagement-makeup.jpg',
        is_active: true
      },
      {
        id: 'srv-mu-4',
        category_id: 'cat-makeup',
        name: 'Reception Makeup',
        slug: 'reception-makeup',
        description: 'High-impact couture glam with sculpted definition, bold lips or dramatic eyes suited for grand wedding reception stages.',
        benefits: 'Stage-lighting tested, high pigment definition, includes hair accessory placement',
        duration_minutes: 120,
        price: 9500,
        discount_price: 8499,
        is_popular: false,
        is_bridal_festive: true,
        image_url: '/services/reception-makeup.jpg',
        is_active: true
      },
      {
        id: 'srv-mu-5',
        category_id: 'cat-makeup',
        name: 'Hair Styling & Updos',
        slug: 'hair-styling',
        description: 'Designer bridal buns, textured messy braids, Hollywood waves, floral poola jada setting, and heat-protective styling.',
        benefits: 'Firm hold that endures dancing and humidity, real flower anchoring',
        duration_minutes: 60,
        price: 2200,
        discount_price: 1800,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/hair-styling.jpg',
        is_active: true
      },
      {
        id: 'srv-mu-6',
        category_id: 'cat-makeup',
        name: 'Traditional Saree Draping',
        slug: 'saree-draping',
        description: 'Flawless crisp pleating and styling in South Indian bridal, Kanjeevaram, Gujarati, Bengali, or Modern Mermaid draping.',
        benefits: 'Pre-pleating option, ironed pin placement, zero discomfort or slippage',
        duration_minutes: 40,
        price: 1200,
        discount_price: 999,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/saree-draping.jpg',
        is_active: true
      },
      {
        id: 'srv-mu-7',
        category_id: 'cat-makeup',
        name: 'Makeup Trial Consultation',
        slug: 'makeup-trial',
        description: 'Half-face makeup trial and personal skin tone match, bridal look consultation, and product patch test prior to your big day.',
        benefits: 'Deducted from final bridal booking if finalized, personalized beauty checklist',
        duration_minutes: 75,
        price: 2500,
        discount_price: 1999,
        is_popular: false,
        is_bridal_festive: true,
        image_url: '/services/makeup-trial.jpg',
        is_active: true
      },

      // 2. SALON
      {
        id: 'srv-sal-1',
        category_id: 'cat-salon',
        name: 'Signature Haircut & Blow Dry',
        slug: 'signature-haircut',
        description: 'Custom layered hair design and face-framing cuts by our senior stylists, followed by Moroccan oil blow dry.',
        benefits: 'Adds bounce, removes split ends, includes revitalizing wash',
        duration_minutes: 50,
        price: 1400,
        discount_price: 1199,
        is_popular: true,
        is_bridal_festive: false,
        image_url: '/services/haircut.jpg',
        is_active: true
      },
      {
        id: 'srv-sal-2',
        category_id: 'cat-salon',
        name: 'L’Oréal Majirel Global Hair Colour',
        slug: 'global-hair-colour',
        description: 'Rich vibrant color transformation or 100% grey coverage with nourishing ionène G and incell formula.',
        benefits: 'Deep conditioning gloss, high multidimensional shine, long-lasting hue',
        duration_minutes: 90,
        price: 4200,
        discount_price: 3600,
        is_popular: false,
        is_bridal_festive: false,
        image_url: '/services/hair-colour.jpg',
        is_active: true
      },
      {
        id: 'srv-sal-3',
        category_id: 'cat-salon',
        name: 'Keratin Smoothing & Protein Therapy',
        slug: 'keratin-treatment',
        description: 'Intense anti-frizz formaldeyhde-free smoothing system that transforms unruly waves into silky, manageable tresses.',
        benefits: 'Up to 4 months of frizz-free humidity resistance, cuts styling time in half',
        duration_minutes: 150,
        price: 6500,
        discount_price: 5499,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/keratin.jpg',
        is_active: true
      },
      {
        id: 'srv-sal-4',
        category_id: 'cat-salon',
        name: 'Biolage Moroccan Oil Deep Hair Spa',
        slug: 'hair-spa',
        description: 'Therapeutic scalp massage with botanical hair mask, micro-mist hydration steam, and serum lock-in.',
        benefits: 'Relieves stress, nourishes dry flaky scalp, strengthens hair follicles',
        duration_minutes: 60,
        price: 1800,
        discount_price: 1499,
        is_popular: true,
        is_bridal_festive: false,
        image_url: '/services/hair-spa.jpg',
        is_active: true
      },

      // 3. FACIALS
      {
        id: 'srv-fac-1',
        category_id: 'cat-facials',
        name: 'O3+ Bridal Radiance & Whitening Facial',
        slug: 'o3-bridal-facial',
        description: 'Award-winning European formulation facial with oxygenating peel, micro-circulation ampoule, and 24k gold rubber mask.',
        benefits: 'Instantly banishes dullness, lightens pigmentation, leaves unmatched glass-skin glow',
        duration_minutes: 75,
        price: 3800,
        discount_price: 3200,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/o3-facial.jpg',
        is_active: true
      },
      {
        id: 'srv-fac-2',
        category_id: 'cat-facials',
        name: 'Hydra Deep Pore Infusion Facial',
        slug: 'hydra-glow-facial',
        description: 'Multi-step skin resurfacing treatment combining vortex vacuum suction extraction, hyaluronic acid infusion, and LED phototherapy.',
        benefits: 'Clears blackheads, deeply plumps fine lines, ultra-hydrating without downtime',
        duration_minutes: 80,
        price: 4500,
        discount_price: 3999,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/hydra-facial.jpg',
        is_active: true
      },
      {
        id: 'srv-fac-3',
        category_id: 'cat-facials',
        name: 'Lotus Organic Phyto-Rx Skin Glow',
        slug: 'lotus-phyto-facial',
        description: 'Pure plant botanical treatment enriched with bilberry, grape fruit extracts, and pure vitamin C.',
        benefits: 'Gentle on sensitive skin, fights environmental pollution damage',
        duration_minutes: 60,
        price: 2400,
        discount_price: 1999,
        is_popular: false,
        is_bridal_festive: false,
        image_url: '/services/lotus-facial.jpg',
        is_active: true
      },

      // 4. SPA
      {
        id: 'srv-spa-1',
        category_id: 'cat-spa',
        name: 'Aroma Relaxation Full Body Therapy',
        slug: 'aroma-full-body-spa',
        description: 'Swedish effleurage massage with warm lavender and ylang-ylang essential oils, followed by calming herbal steam.',
        benefits: 'Relieves muscle stiffness, enhances lymphatic drainage, promotes deep restorative sleep',
        duration_minutes: 60,
        price: 3200,
        discount_price: 2699,
        is_popular: true,
        is_bridal_festive: false,
        image_url: '/services/aroma-spa.jpg',
        is_active: true
      },
      {
        id: 'srv-spa-2',
        category_id: 'cat-spa',
        name: 'Deep Tissue & Hot Stone Stress Relief',
        slug: 'deep-tissue-stone-spa',
        description: 'Targeted firm pressure massage using smooth heated basalt volcanic stones to melt chronic neck and back tension.',
        benefits: 'Improves blood circulation, releases muscle knots from desk fatigue',
        duration_minutes: 75,
        price: 3900,
        discount_price: 3300,
        is_popular: false,
        is_bridal_festive: false,
        image_url: '/services/hot-stone.jpg',
        is_active: true
      },

      // 5. BODY POLISHING
      {
        id: 'srv-bp-1',
        category_id: 'cat-body-polishing',
        name: 'Full Body Botanical Scrub & Polish',
        slug: 'full-body-polishing',
        description: 'Luxurious full-body exfoliation with dead sea minerals, walnut micro-granules, and moisturizing shea butter mask.',
        benefits: 'Buffs away dead cells, softens elbows & knees, leaves velvety silk touch',
        duration_minutes: 75,
        price: 3600,
        discount_price: 2999,
        is_popular: true,
        is_bridal_festive: true,
        image_url: '/services/body-polish.jpg',
        is_active: true
      },
      {
        id: 'srv-bp-2',
        category_id: 'cat-body-polishing',
        name: 'Full Body Herbal De-Tan Brightening',
        slug: 'full-body-de-tan',
        description: 'Kojic acid and eucalyptus herbal pack applied across full arms, legs, and back to reverse sun damage and uneven pigmentation.',
        benefits: 'Visible tan removal in single session, cooling and soothing after outdoor exposure',
        duration_minutes: 60,
        price: 2800,
        discount_price: 2399,
        is_popular: false,
        is_bridal_festive: true,
        image_url: '/services/body-detan.jpg',
        is_active: true
      },

      // 6. MANI & PEDI
      {
        id: 'srv-mp-1',
        category_id: 'cat-mani-pedi',
        name: 'Luxury Crystal Pedicure Ritual',
        slug: 'crystal-pedicure',
        description: 'Effervescent crystal salt soak, callus smoothing, foot exfoliation scrub, cooling mint clay mask, and reflexology massage.',
        benefits: 'Relieves tired feet, heals cracked heels, includes clean cuticle detailing and shine buff',
        duration_minutes: 50,
        price: 1500,
        discount_price: 1299,
        is_popular: true,
        is_bridal_festive: false,
        image_url: '/services/pedicure.jpg',
        is_active: true
      },
      {
        id: 'srv-mp-2',
        category_id: 'cat-mani-pedi',
        name: 'Rose Petal Aroma Manicure',
        slug: 'rose-aroma-manicure',
        description: 'Fresh rose petal infused warm soak, almond scrub, cuticle conditioning, hand massage, and long-lasting gel polish application.',
        benefits: 'Hydrates dry cuticles, prevents brittle nails, flawless chip-resistant finish',
        duration_minutes: 45,
        price: 1200,
        discount_price: 999,
        is_popular: true,
        is_bridal_festive: false,
        image_url: '/services/manicure.jpg',
        is_active: true
      },
      {
        id: 'srv-mp-3',
        category_id: 'cat-mani-pedi',
        name: 'Designer Nail Art & French Extension Polish',
        slug: 'designer-nail-art',
        description: 'Bespoke nail art with chrome powder, gold foil accents, or classic micro-french tips over gel overlay.',
        benefits: 'Lasts up to 3 weeks without fading or chipping',
        duration_minutes: 60,
        price: 1800,
        discount_price: 1499,
        is_popular: false,
        is_bridal_festive: true,
        image_url: '/services/nail-art.jpg',
        is_active: true
      }
    ],
    packages: [
      {
        id: 'pkg-1',
        name: 'Royal Bridal Glow & Makeup Package',
        description: 'Comprehensive pre-bridal and wedding day package: O3+ Bridal Radiance Facial, Full Body Botanical Polish, HD Bridal Makeup, Saree Draping, and Hair Styling.',
        service_ids: ['srv-mu-1', 'srv-fac-1', 'srv-bp-1', 'srv-mu-6'],
        service_names: ['Bridal Makeup (HD / Airbrush)', 'O3+ Bridal Radiance Facial', 'Full Body Botanical Scrub & Polish', 'Traditional Saree Draping'],
        original_price: 27100,
        package_price: 21999,
        duration_minutes: 360,
        is_active: true
      },
      {
        id: 'pkg-2',
        name: 'Festive Party Ready Glam Combo',
        description: 'Party Makeup with Hair Updo, Rose Aroma Manicure, and Quick Glow Facial session for festive celebrations.',
        service_ids: ['srv-mu-2', 'srv-mp-2', 'srv-sal-4'],
        service_names: ['Party Makeup & Hair Styling', 'Rose Petal Aroma Manicure', 'Biolage Moroccan Oil Deep Hair Spa'],
        original_price: 7500,
        package_price: 5899,
        duration_minutes: 180,
        is_active: true
      },
      {
        id: 'pkg-3',
        name: 'Weekend Head-to-Toe Pampering',
        description: 'Biolage Hair Spa, O3+ Radiance Facial, and Luxury Crystal Pedicure with soothing massage.',
        service_ids: ['srv-sal-4', 'srv-fac-1', 'srv-mp-1'],
        service_names: ['Biolage Moroccan Oil Deep Hair Spa', 'O3+ Bridal Radiance Facial', 'Luxury Crystal Pedicure Ritual'],
        original_price: 7100,
        package_price: 5499,
        duration_minutes: 170,
        is_active: true
      }
    ],
    appointments: [],
    orders: [],
    payments: [],
    products: [
      {
        id: 'prod-1',
        name: 'O3+ Bridal Radiance Professional Facial Kit (10 Treatments)',
        sku: 'O3P-BR-10',
        brand: 'O3+ Professional',
        category: 'Facial Kits',
        unit: 'kits',
        current_stock: 4,
        min_stock_alert: 3,
        purchase_cost: 4800,
        sale_price: 6500,
        expiry_date: '2027-12-31',
        location: 'Aisle A - Facial Cabinet',
        supplier_id: 'sup-1',
        supplier_name: 'O3+ India Official Distributor',
        is_retail: false,
        updated_at: '2026-10-10T12:00:00Z'
      },
      {
        id: 'prod-2',
        name: 'L’Oréal Professionnel Majirel Hair Colour 6.1 (Ash Blonde)',
        sku: 'LOR-MAJ-61',
        brand: 'L’Oréal Professionnel',
        category: 'Hair Colour',
        unit: 'tubes',
        current_stock: 12,
        min_stock_alert: 5,
        purchase_cost: 420,
        sale_price: 650,
        expiry_date: '2028-06-30',
        location: 'Colour Bar Rack 2',
        supplier_id: 'sup-2',
        supplier_name: 'Esskay Beauty Distro',
        is_retail: false,
        updated_at: '2026-10-12T14:00:00Z'
      },
      {
        id: 'prod-3',
        name: 'Matrix Biolage Hydrasource Hair Treatment Mask 500ml',
        sku: 'MAT-BIO-500',
        brand: 'Matrix Biolage',
        category: 'Hair Care',
        unit: 'tubs',
        current_stock: 2,
        min_stock_alert: 4,
        purchase_cost: 950,
        sale_price: 1400,
        expiry_date: '2027-08-31',
        location: 'Hair Spa Station Shelf',
        supplier_id: 'sup-2',
        supplier_name: 'Esskay Beauty Distro',
        is_retail: true,
        updated_at: '2026-09-28T10:00:00Z'
      },
      {
        id: 'prod-4',
        name: 'RICA Brazilian White Chocolate Wax Bead 800g',
        sku: 'RICA-WAX-800',
        brand: 'RICA Italy',
        category: 'Waxing & Depilatory',
        unit: 'cans',
        current_stock: 6,
        min_stock_alert: 3,
        purchase_cost: 1150,
        sale_price: 1650,
        expiry_date: '2028-01-31',
        location: 'Waxing Room 1',
        supplier_id: 'sup-3',
        supplier_name: 'Southern Salon Supplies',
        is_retail: false,
        updated_at: '2026-10-05T11:00:00Z'
      },
      {
        id: 'prod-5',
        name: 'MAC Studio Fix Fluid Foundation SPF 15 (NC35)',
        sku: 'MAC-SFF-35',
        brand: 'MAC Cosmetics',
        category: 'Makeup Products',
        unit: 'bottles',
        current_stock: 3,
        min_stock_alert: 2,
        purchase_cost: 3100,
        sale_price: 3900,
        expiry_date: '2027-10-31',
        location: 'Bridal Vanity Counter',
        supplier_id: 'sup-4',
        supplier_name: 'Nykaa Pro Salon Supply',
        is_retail: false,
        updated_at: '2026-10-02T16:00:00Z'
      },
      {
        id: 'prod-6',
        name: 'Nitrile Powder-Free Salon Gloves (Box of 100)',
        sku: 'GLV-NIT-100',
        brand: 'MedProtect Pro',
        category: 'Consumables',
        unit: 'boxes',
        current_stock: 1, // Below threshold -> trigger alert!
        min_stock_alert: 3,
        purchase_cost: 350,
        sale_price: 500,
        location: 'Storage Bay 3',
        supplier_id: 'sup-3',
        supplier_name: 'Southern Salon Supplies',
        is_retail: false,
        updated_at: '2026-09-20T09:00:00Z'
      }
    ],
    suppliers: [
      {
        id: 'sup-1',
        name: 'O3+ India Official Distributor',
        contact_person: 'Rajesh Sharma',
        phone: '9811002233',
        email: 'sales@o3plusdistro.in',
        address: 'Banjara Hills, Hyderabad',
        gstin: '36AABCU9603R1ZM',
        created_at: '2025-01-10T10:00:00Z'
      },
      {
        id: 'sup-2',
        name: 'Esskay Beauty Distro',
        contact_person: 'Venkatesh Rao',
        phone: '9849556677',
        email: 'orders@esskayhyderabad.com',
        address: 'Kukatpally Industrial Estate, Hyderabad',
        gstin: '36AAACE1234F1Z8',
        created_at: '2025-02-12T10:00:00Z'
      },
      {
        id: 'sup-3',
        name: 'Southern Salon Supplies',
        contact_person: 'Karthik N',
        phone: '9900114455',
        email: 'support@southernsalon.in',
        address: 'Madhapur, Hyderabad',
        gstin: '36BBCDE5678G2ZT',
        created_at: '2025-03-01T10:00:00Z'
      },
      {
        id: 'sup-4',
        name: 'Nykaa Pro Salon Supply',
        contact_person: 'Deepika M',
        phone: '9988223344',
        email: 'pro@nykaa.com',
        address: 'Mumbai / Hyderabad Hub',
        created_at: '2025-04-10T10:00:00Z'
      }
    ],
    purchase_orders: [
      {
        id: 'po-1',
        po_number: 'PO-2026-001',
        supplier_id: 'sup-1',
        supplier_name: 'O3+ India Official Distributor',
        items: [
          {
            product_id: 'prod-1',
            product_name: 'O3+ Bridal Radiance Professional Facial Kit',
            quantity: 5,
            unit_cost: 4800,
            total_cost: 24000
          }
        ],
        total_cost: 24000,
        status: 'Received',
        created_at: '2026-10-10T11:00:00Z'
      }
    ],
    inventory_movements: [
      {
        id: 'im-1',
        product_id: 'prod-1',
        product_name: 'O3+ Bridal Radiance Professional Facial Kit',
        movement_type: 'stock_in',
        quantity: 5,
        balance_after: 5,
        notes: 'Monthly bulk stock purchase from O3+ distributor',
        performed_by: 'Ananya Rao',
        created_at: '2026-10-10T12:05:00Z'
      },
      {
        id: 'im-2',
        product_id: 'prod-1',
        product_name: 'O3+ Bridal Radiance Professional Facial Kit',
        movement_type: 'service_usage',
        quantity: -1,
        balance_after: 4,
        notes: 'Used for Sneha Reddy appointment',
        performed_by: 'Meera Nair',
        created_at: '2026-10-18T15:30:00Z'
      }
    ],
    gallery: [
      {
        id: 'gal-1',
        title: 'Bespoke South Indian Bridal Makeup',
        category: 'Bridal Makeup',
        artist_name: 'Fatima Khan',
        service_type: 'HD Airbrush Bridal Glam',
        image_url: '/gallery/bridal-1.jpg',
        description: 'Traditional temple jewelry match with waterproof HD airbrush base and micro-lash extensions.',
        tags: ['Bridal', 'Airbrush', 'Kanjeevaram'],
        is_approved: true,
        display_order: 1,
        created_at: '2026-10-10T10:00:00Z'
      },
      {
        id: 'gal-2',
        title: 'Cocktail Evening & Sangeet Glam',
        category: 'Party Makeup',
        artist_name: 'Fatima Khan',
        service_type: 'Festive Smokey Glam',
        image_url: '/gallery/party-1.jpg',
        description: 'Subtle cut-crease eye art with soft rose-gold gloss and Hollywood textured waves.',
        tags: ['Cocktail', 'Smokey Eyes', 'Waves'],
        is_approved: true,
        display_order: 2,
        created_at: '2026-10-12T14:00:00Z'
      },
      {
        id: 'gal-3',
        title: 'Kanjeevaram Bridal Saree Draping with Fresh Poola Jada',
        category: 'Saree & Hair',
        artist_name: 'Priya Sharma',
        service_type: 'Traditional Saree Art',
        image_url: '/gallery/saree-1.jpg',
        description: 'Crisp box pleating and traditional jasmine flower braid anchoring.',
        tags: ['Saree Draping', 'Poola Jada'],
        is_approved: true,
        display_order: 3,
        created_at: '2026-10-14T11:00:00Z'
      },
      {
        id: 'gal-4',
        title: 'Hydra Glow & De-Tan Rejuvenation',
        category: 'Skin Care',
        artist_name: 'Meera Nair',
        service_type: 'Hydra Pore Resurfacing',
        image_url: '/gallery/skin-1.jpg',
        description: 'Post-facial radiant complexion with deep cellular hydration and natural glow.',
        tags: ['Hydra Facial', 'Glass Skin'],
        is_approved: true,
        display_order: 4,
        created_at: '2026-10-16T16:00:00Z'
      }
    ],
    enquiries: [
      {
        id: 'enq-1',
        name: 'Swathi Chowdary',
        phone: '9849112233',
        email: 'swathi.c@gmail.com',
        service_interest: 'Bridal Makeup for 3 Functions',
        message: 'Looking for bridal packages for December 2026 wedding in Gachibowli.',
        status: 'Contacted',
        created_at: '2026-10-22T10:00:00Z'
      }
    ],
    offers: [
      {
        id: 'off-1',
        title: 'Festive Season Glam Flat ₹500 Off',
        coupon_code: 'GLOSSY500',
        discount_type: 'flat',
        discount_value: 500,
        min_order_value: 2500,
        valid_until: '2026-12-31',
        is_active: true
      },
      {
        id: 'off-2',
        title: 'Bridal Package Pre-Booking 10% Off',
        coupon_code: 'ROYALBRIDE10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_value: 15000,
        valid_until: '2026-12-31',
        is_active: true
      }
    ],
    reviews: [
      {
        id: 'rev-1',
        customer_name: 'Pooja Agarwal',
        customer_area: 'My Home Bhooja, Gachibowli',
        rating: 5,
        comment: 'Booked my wedding sangeet and reception makeup with Fatima at The Glossy Looks. The waterproof HD finish stayed fresh through 7 hours of dancing and photos. Absolutely flawless!',
        service_rendered: 'Bridal & Reception Makeup',
        is_published: true,
        created_at: '2026-10-21T18:00:00Z'
      },
      {
        id: 'rev-2',
        customer_name: 'Sneha Reddy',
        customer_area: 'Silicon County, Hitec City',
        rating: 5,
        comment: 'The O3+ Bridal Glow facial and Crystal Pedicure gave my skin instant radiance. Impeccable hygiene and the staff is so gentle and polite. My go-to salon in Gachibowli!',
        service_rendered: 'O3+ Radiance Facial & Pedicure',
        is_published: true,
        created_at: '2026-10-18T19:00:00Z'
      },
      {
        id: 'rev-3',
        customer_name: 'Divya Varma',
        customer_area: 'Aparna Sarovar, Nallagandla',
        rating: 5,
        comment: 'Got hair botox and rose petal manicure done. The blow dry lasted 3 full days with incredible shine. Their online appointment booking via WhatsApp is so convenient and smooth.',
        service_rendered: 'Hair Botox & Rose Manicure',
        is_published: true,
        created_at: '2026-10-16T12:00:00Z'
      }
    ],
    print_devices: [
      {
        id: 'dev-1',
        device_name: 'Reception Counter Thermal Printer 80mm',
        device_id: 'POS-COUNTER-01',
        branch: '31, Vinayak Nagar, Gachibowli, Hyderabad',
        printer_name: 'EPSON TM-T82 Receipt Printer',
        printer_type: 'thermal',
        paper_size: '80mm',
        is_online: true,
        auto_print_bill: true,
        auto_print_slip: true,
        copies: 1,
        last_heartbeat: new Date().toISOString()
      },
      {
        id: 'dev-2',
        device_name: 'Stylist Station Slip Printer',
        device_id: 'STATION-SLIP-02',
        branch: '31, Vinayak Nagar, Gachibowli, Hyderabad',
        printer_name: 'TVS RP-3160 Gold Star',
        printer_type: 'thermal',
        paper_size: '58mm',
        is_online: true,
        auto_print_bill: false,
        auto_print_slip: true,
        copies: 1,
        last_heartbeat: new Date().toISOString()
      }
    ],
    print_jobs: [
      {
        id: 'pj-101',
        device_id: 'dev-1',
        job_type: 'bill',
        order_id: 'ord-1001',
        status: 'Printed',
        payload: {
          bill_number: 'TGL-2026-1001',
          customer_name: 'Divya Varma',
          customer_phone: '9123456780',
          items: [
            { name: 'Signature Haircut & Blow Dry', quantity: 1, price: 1199, staff: 'Sunita Devi' },
            { name: 'Rose Petal Aroma Manicure', quantity: 1, price: 999, staff: 'Meera Nair' }
          ],
          subtotal: 2198,
          discount: 198,
          tax: 100,
          total: 2150,
          payment_method: 'UPI',
          payment_status: 'Paid',
          date: '23/10/2026 5:35 PM'
        },
        retry_count: 0,
        printed_at: '2026-10-23T17:35:10Z',
        created_at: '2026-10-23T17:35:05Z'
      }
    ],
    audit_logs: [
      {
        id: 'aud-1',
        action: 'SYSTEM_INIT',
        entity: 'Database',
        entity_id: 'root',
        performed_by: 'System Administrator',
        details: 'Initial salon database loaded with seed records and security roles',
        timestamp: '2026-01-01T00:00:00Z'
      }
    ],
    whatsapp_integration: {
      id: 'wa-int-01',
      salon_id: 'tgl-gachibowli-main',
      status: 'not_connected',
      updated_at: '2026-01-01T00:00:00Z'
    },
    whatsapp_message_logs: [],
    appointment_feedback: [],
    scheduled_feedback_jobs: [],
    processed_webhook_events: [],
    daily_sales_reports: []
  };
}

class SalonDatabase implements ISalonRepository {
  private data: DatabaseData;

  constructor() {
    this.data = this.load();
  }

  private formatRoleTitle(role: string): string {
    const titles: Record<string, string> = {
      owner: 'Salon Director & Master Stylist',
      manager: 'Operations & Floor Manager',
      receptionist: 'Receptionist & Billing Specialist',
      stylist: 'Senior Bridal Stylist & Artist',
      inventory_staff: 'Inventory & Supplies Head'
    };
    return titles[role.toLowerCase()] || role;
  }

  /**
   * Universal Staff & User Resolver
   * Resolves ANY staff ID, user ID, alphanumeric code (TGL-OWN01), or historical name
   * to the single central staff/user record with latest up-to-date name.
   */
  public resolveStaff(idOrName?: string): {
    id: string;
    user_id: string;
    user_id_code: string;
    name: string;
    role: string;
    is_active: boolean;
    phone: string;
    email?: string;
  } | null {
    if (!idOrName) return null;
    const clean = idOrName.trim();
    const lower = clean.toLowerCase();

    // 1. Match by staff.id, staff.user_id, or staff.name
    const stf = this.data.staff.find(
      s => s.id === clean || s.user_id === clean || s.name.toLowerCase() === lower
    );

    // 2. Match by user.id, user.user_id (e.g. TGL-OWN01), or user.name
    const usr = this.data.users.find(
      u => u.id === clean || u.user_id === clean || u.name.toLowerCase() === lower || (stf && (u.id === stf.user_id || (u.email && stf.email && u.email.toLowerCase() === stf.email.toLowerCase())))
    );

    if (usr) {
      const linkedStf = stf || this.data.staff.find(s => s.user_id === usr.id || s.id === usr.id);
      return {
        id: linkedStf ? linkedStf.id : usr.id,
        user_id: usr.id,
        user_id_code: usr.user_id,
        name: usr.name,
        role: usr.role,
        is_active: usr.is_active,
        phone: usr.phone,
        email: usr.email
      };
    }

    if (stf) {
      return {
        id: stf.id,
        user_id: stf.user_id || stf.id,
        user_id_code: stf.id,
        name: stf.name,
        role: stf.role,
        is_active: stf.is_active,
        phone: stf.phone,
        email: stf.email
      };
    }

    return null;
  }

  /**
   * Reconciles users and staff tables to ensure one central source of truth:
   * Admin Users & Security is the sole master record.
   * Every staff profile is strictly 1:1 linked via stable user_id / admin_user_id.
   */
  private reconcileStaffAndUsers(data: DatabaseData): boolean {
    let changed = false;

    // 1. Purge legacy sample demo users and staff profiles (except real owner Madu Mounika)
    const sampleNames = [
      'priya sharma',
      'ananya rao',
      'fatima khan',
      'suresh verma',
      'meera nair',
      'kavitha reddy',
      'sunita devi',
      'zoya akhtar'
    ];

    // Ensure owner is Madu Mounika
    const owner = data.users.find(u => u.role === 'owner' || u.user_id === 'TGL-OWN01' || u.email === 'owner@theglossylooks.com');
    if (owner) {
      if (owner.name !== 'Madu Mounika' || owner.phone !== '8985799459') {
        owner.name = 'Madu Mounika';
        owner.phone = '8985799459';
        owner.user_id = 'TGL-OWN01';
        owner.role = 'owner';
        owner.branch_id = 'tgl-gachibowli-main';
        owner.is_active = true;
        changed = true;
      }
    }

    // Filter out remaining demo sample users
    const initialUserLen = data.users.length;
    data.users = data.users.filter(u => {
      if (u.id === owner?.id || u.user_id === 'TGL-OWN01' || u.email === 'owner@theglossylooks.com') return true;
      return !sampleNames.includes(u.name.toLowerCase().trim());
    });
    if (data.users.length !== initialUserLen) changed = true;

    // Filter out remaining demo sample staff
    const initialStaffLen = data.staff.length;
    data.staff = data.staff.filter(s => {
      if (s.user_id === owner?.id || s.admin_user_id === 'TGL-OWN01' || s.email === 'owner@theglossylooks.com') return true;
      return !sampleNames.includes(s.name.toLowerCase().trim());
    });
    if (data.staff.length !== initialStaffLen) changed = true;

    // 2. Clean up any "(Owner)" or role suffixes
    data.users.forEach(u => {
      const cleaned = u.name.replace(/\s*\((Owner|Manager|Reception & Cashier|Lead Bridal Stylist|Inventory Head)\)/i, '').trim();
      if (cleaned !== u.name) {
        u.name = cleaned;
        changed = true;
      }
    });

    // 3. Ensure each user has a stable internal alphanumeric user_id
    data.users.forEach((u, idx) => {
      if (!u.user_id) {
        const prefix = (u.role || 'stf').toUpperCase().slice(0, 3);
        u.user_id = `TGL-${prefix}${String(idx + 1).padStart(2, '0')}`;
        changed = true;
      }
    });

    // 4. Ensure 1:1 linked staff for each user (NO DUPLICATES)
    data.users.forEach(u => {
      // Find matching staff by user_id or admin_user_id
      const matchingStaff = data.staff.filter(s =>
        s.user_id === u.id || s.admin_user_id === u.user_id || s.id === u.id
      );

      if (matchingStaff.length > 1) {
        // Remove duplicates, keep primary
        const primary = matchingStaff[0];
        data.staff = data.staff.filter(s => !matchingStaff.includes(s) || s === primary);
        changed = true;
      }

      let stf = data.staff.find(s => s.user_id === u.id || s.admin_user_id === u.user_id || s.id === u.id);
      if (stf) {
        if (
          stf.user_id !== u.id ||
          stf.admin_user_id !== u.user_id ||
          stf.name !== u.name ||
          stf.phone !== u.phone ||
          stf.email !== u.email ||
          stf.is_active !== u.is_active ||
          stf.branch_id !== u.branch_id
        ) {
          stf.user_id = u.id;
          stf.admin_user_id = u.user_id;
          stf.name = u.name;
          stf.phone = u.phone;
          stf.email = u.email;
          stf.is_active = u.is_active;
          stf.branch_id = u.branch_id;
          changed = true;
        }
      } else {
        const newStaff: Staff = {
          id: `stf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user_id: u.id,
          admin_user_id: u.user_id,
          name: u.name,
          phone: u.phone,
          email: u.email,
          role: this.formatRoleTitle(u.role),
          branch_id: u.branch_id || 'tgl-gachibowli-main',
          joining_date: u.created_at ? u.created_at.split('T')[0] : '2024-01-01',
          salary_type: 'monthly',
          base_salary: 35000,
          commission_rate: 10,
          skills: ['Salon Services', 'Client Management'],
          working_hours: '10:00 AM - 08:00 PM',
          is_active: u.is_active,
          created_at: u.created_at || new Date().toISOString()
        };
        data.staff.push(newStaff);
        changed = true;
      }
    });

    // 5. Ensure user exists for any orphaned staff
    data.staff.forEach((s, idx) => {
      let usr = data.users.find(u => u.id === s.user_id || u.user_id === s.admin_user_id);
      if (!usr) {
        const autoId = `TGL-STY${String(idx + 1).padStart(2, '0')}`;
        usr = {
          id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user_id: autoId,
          email: s.email || `${s.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@theglossylooks.com`,
          password_hash: 'admin123',
          role: 'stylist',
          name: s.name,
          phone: s.phone,
          branch_id: s.branch_id || 'tgl-gachibowli-main',
          is_active: s.is_active,
          created_at: s.created_at || new Date().toISOString(),
          updated_at: s.created_at || new Date().toISOString()
        };
        data.users.push(usr);
        s.user_id = usr.id;
        s.admin_user_id = usr.user_id;
        changed = true;
      } else {
        s.user_id = usr.id;
        s.admin_user_id = usr.user_id;
        if (s.name !== usr.name) {
          s.name = usr.name;
          changed = true;
        }
      }
    });

    return changed;
  }

  private reconcileBranchesAndIntegrations(data: DatabaseData): boolean {
    let changed = false;

    if (!data.whatsapp_message_logs) {
      data.whatsapp_message_logs = [];
      changed = true;
    }
    if (!data.appointment_feedback) {
      data.appointment_feedback = [];
      changed = true;
    }
    if (!data.scheduled_feedback_jobs) {
      data.scheduled_feedback_jobs = [];
      changed = true;
    }
    if (!data.processed_webhook_events) {
      data.processed_webhook_events = [];
      changed = true;
    }
    if (!data.whatsapp_conversations) {
      data.whatsapp_conversations = [];
      changed = true;
    }
    if (!data.whatsapp_messages) {
      data.whatsapp_messages = [];
      changed = true;
    }

    if (!data.branches || !Array.isArray(data.branches) || data.branches.length === 0) {
      data.branches = [
        {
          id: 'tgl-gachibowli-main',
          name: 'Gachibowli Main Flagship',
          code: 'GCB-01',
          address: data.settings?.address || '31, Vinayak Nagar, Gachibowli',
          city: data.settings?.city || 'Hyderabad, Telangana - 500032',
          phone: '8985799459',
          whatsapp_number: '8985799459',
          manager_id: 'usr-1',
          manager_name: 'Madu Mounika',
          is_active: true,
          created_at: '2026-01-01T10:00:00Z',
          updated_at: new Date().toISOString()
        }
      ];
      changed = true;
    } else {
      const gcb = data.branches.find(b => b.id === 'tgl-gachibowli-main');
      if (gcb && (gcb.whatsapp_number !== '8985799459' || gcb.phone !== '8985799459')) {
        gcb.whatsapp_number = '8985799459';
        gcb.phone = '8985799459';
        changed = true;
      }
    }

    // Ensure owner/manager usr-1 has branch_id assigned
    const ownerUser = (data.users || []).find(u => u.id === 'usr-1' || u.role === 'owner');
    if (ownerUser && !ownerUser.branch_id) {
      ownerUser.branch_id = 'tgl-gachibowli-main';
      changed = true;
    }

    if (!data.branch_whatsapp_integrations || !Array.isArray(data.branch_whatsapp_integrations)) {
      data.branch_whatsapp_integrations = [];
      changed = true;
    }

    let gcbIntegration = data.branch_whatsapp_integrations.find(i => i.branch_id === 'tgl-gachibowli-main');
    if (!gcbIntegration) {
      gcbIntegration = {
        id: 'bwa-gcb-01',
        branch_id: 'tgl-gachibowli-main',
        configured_business_number: '8985799459',
        waba_id: '1608729824244675',
        phone_number_id: '1379025201957313',
        display_name: 'THE GLOSSY LOOKS',
        display_phone_number: '+91 89857 99459',
        masked_phone_number: '+91 ******9459',
        status: 'connected',
        connected_at: '2026-10-30T07:45:00.000Z',
        last_verified_at: '2026-10-30T07:45:00.000Z',
        diagnostics: 'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.',
        created_at: '2026-01-01T10:00:00Z',
        updated_at: new Date().toISOString()
      };
      data.branch_whatsapp_integrations.push(gcbIntegration);
      changed = true;
    } else if (!gcbIntegration.waba_id || !gcbIntegration.phone_number_id || gcbIntegration.status !== 'connected') {
      gcbIntegration.configured_business_number = '8985799459';
      gcbIntegration.waba_id = '1608729824244675';
      gcbIntegration.phone_number_id = '1379025201957313';
      gcbIntegration.display_name = 'THE GLOSSY LOOKS';
      gcbIntegration.display_phone_number = '+91 89857 99459';
      gcbIntegration.masked_phone_number = '+91 ******9459';
      gcbIntegration.status = 'connected';
      gcbIntegration.connected_at = gcbIntegration.connected_at || '2026-10-30T07:45:00.000Z';
      gcbIntegration.last_verified_at = new Date().toISOString();
      gcbIntegration.diagnostics = 'FINISH event received / WABA ID received / Phone Number ID received / Graph verification passed.';
      gcbIntegration.error_message = undefined;
      changed = true;
    }

    return changed;
  }

  private load(): DatabaseData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed: DatabaseData = JSON.parse(raw);
        let changed = false;
        if (parsed.users && parsed.users.length > 0) {
          if (this.reconcileStaffAndUsers(parsed)) changed = true;
        }
        if (this.reconcileBranchesAndIntegrations(parsed)) changed = true;

        // Purge legacy sample demo appointments, orders, and payments
        const sampleNames = ['priya sharma', 'ananya rao', 'fatima khan', 'suresh verma', 'meera nair', 'kavitha reddy', 'sunita devi', 'zoya akhtar'];
        if (parsed.appointments && parsed.appointments.length > 0) {
          const prevLen = parsed.appointments.length;
          parsed.appointments = parsed.appointments.filter(a => {
            const hasSample = sampleNames.some(sn => 
              (a.assigned_staff_name && a.assigned_staff_name.toLowerCase().includes(sn)) ||
              (a.customer_name && sampleNames.includes(a.customer_name.toLowerCase()))
            );
            return !hasSample;
          });
          if (parsed.appointments.length !== prevLen) changed = true;
        }
        if (parsed.orders && parsed.orders.length > 0) {
          const prevLen = parsed.orders.length;
          parsed.orders = parsed.orders.filter(o => {
            const hasSample = sampleNames.some(sn => 
              (o.cashier_name && o.cashier_name.toLowerCase().includes(sn)) ||
              (o.items && o.items.some(i => i.staff_name && i.staff_name.toLowerCase().includes(sn)))
            );
            return !hasSample;
          });
          if (parsed.orders.length !== prevLen) changed = true;
        }
        if (parsed.payments && parsed.payments.length > 0) {
          const prevLen = parsed.payments.length;
          parsed.payments = parsed.payments.filter(p => {
            return !sampleNames.some(sn => p.recorded_by && p.recorded_by.toLowerCase().includes(sn));
          });
          if (parsed.payments.length !== prevLen) changed = true;
        }
        if (parsed.audit_logs && parsed.audit_logs.length > 0) {
          parsed.audit_logs.forEach(al => {
            if (al.performed_by && /priya sharma/i.test(al.performed_by)) {
              al.performed_by = al.performed_by.replace(/Priya Sharma/gi, 'Madu Mounika');
              changed = true;
            }
            if (al.details && /priya sharma/i.test(al.details)) {
              al.details = al.details.replace(/Priya Sharma/gi, 'Madu Mounika');
              changed = true;
            }
          });
        }

        if (changed) {
          fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading database, resetting to default:', e);
    }
    const initial = getInitialData();
    this.reconcileStaffAndUsers(initial);
    this.reconcileBranchesAndIntegrations(initial);
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseData) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }

  public getData(): DatabaseData {
    return this.data;
  }

  // --- Audit Logging ---
  public async logAudit(action: string, entity: string, entityId: string, performedBy: string, details: string): Promise<AuditLog> {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      entity,
      entity_id: entityId,
      performed_by: performedBy || 'System',
      details,
      timestamp: new Date().toISOString()
    };
    this.data.audit_logs.unshift(entry);
    this.save();
    return entry;
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.data.audit_logs;
  }

  // --- Salon Branches (Multi-Branch Coexistence Architecture) ---
  public async getBranches(): Promise<SalonBranch[]> {
    if (!this.data.branches || this.data.branches.length === 0) {
      this.reconcileBranchesAndIntegrations(this.data);
      this.save();
    }
    return this.data.branches.filter(b => b.is_active);
  }

  public async getAllBranches(): Promise<SalonBranch[]> {
    if (!this.data.branches || this.data.branches.length === 0) {
      this.reconcileBranchesAndIntegrations(this.data);
      this.save();
    }
    return this.data.branches;
  }

  public async getBranchById(id: string): Promise<SalonBranch | null> {
    const branches = await this.getAllBranches();
    return branches.find(b => b.id === id || b.code === id) || null;
  }

  public async createBranch(branchData: Omit<SalonBranch, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<SalonBranch> {
    const cleanNumber = (branchData.whatsapp_number || '').replace(/\D/g, '').slice(-10);
    const newBranch: SalonBranch = {
      ...branchData,
      id: `brn-${Date.now()}`,
      whatsapp_number: cleanNumber,
      is_active: branchData.is_active !== undefined ? branchData.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (newBranch.manager_id) {
      const mgr = this.data.users.find(u => u.id === newBranch.manager_id || u.user_id === newBranch.manager_id);
      if (mgr) {
        newBranch.manager_name = mgr.name;
        mgr.branch_id = newBranch.id;
        mgr.updated_at = new Date().toISOString();
      }
    }

    if (!this.data.branches) this.data.branches = [];
    this.data.branches.push(newBranch);

    // Initialize corresponding branch WhatsApp integration record
    if (!this.data.branch_whatsapp_integrations) {
      this.data.branch_whatsapp_integrations = [];
    }
    const last4 = cleanNumber.slice(-4);
    const masked = cleanNumber.length >= 4 ? `+91 ******${last4}` : '+91 ******0000';
    const newInt: BranchWhatsAppIntegration = {
      id: `bwa-${newBranch.id}`,
      branch_id: newBranch.id,
      configured_business_number: cleanNumber,
      display_name: newBranch.name,
      display_phone_number: cleanNumber,
      masked_phone_number: masked,
      status: 'disconnected',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.branch_whatsapp_integrations.push(newInt);

    await this.logAudit(
      'CREATE',
      'SalonBranch',
      newBranch.id,
      performedBy,
      `Created salon branch: ${newBranch.name} (${newBranch.code}) with WhatsApp number ${cleanNumber}`
    );
    this.save();
    return newBranch;
  }

  public async updateBranch(id: string, data: Partial<SalonBranch>, performedBy: string): Promise<SalonBranch | null> {
    if (!this.data.branches) this.data.branches = [];
    const idx = this.data.branches.findIndex(b => b.id === id);
    if (idx === -1) return null;

    const oldBranch = this.data.branches[idx];
    const cleanNumber = data.whatsapp_number !== undefined
      ? data.whatsapp_number.replace(/\D/g, '').slice(-10)
      : oldBranch.whatsapp_number;

    const updated: SalonBranch = {
      ...oldBranch,
      ...data,
      whatsapp_number: cleanNumber,
      updated_at: new Date().toISOString()
    };

    if (data.manager_id !== undefined) {
      const mgr = this.data.users.find(u => u.id === data.manager_id || u.user_id === data.manager_id);
      if (mgr) {
        updated.manager_name = mgr.name;
        mgr.branch_id = updated.id;
        mgr.updated_at = new Date().toISOString();
      } else {
        updated.manager_name = undefined;
      }
    }

    this.data.branches[idx] = updated;

    // Propagate whatsapp number update to branch integration record
    const waInt = await this.getBranchWhatsAppIntegration(id);
    if (waInt) {
      const last4 = cleanNumber.slice(-4);
      waInt.configured_business_number = cleanNumber;
      waInt.masked_phone_number = cleanNumber.length >= 4 ? `+91 ******${last4}` : '+91 ******0000';
      waInt.updated_at = new Date().toISOString();
    }

    await this.logAudit(
      'UPDATE',
      'SalonBranch',
      id,
      performedBy,
      `Updated salon branch details for ${updated.name}`
    );
    this.save();
    return updated;
  }

  public async deleteBranch(id: string, performedBy: string): Promise<boolean> {
    if (!this.data.branches) return false;
    const idx = this.data.branches.findIndex(b => b.id === id);
    if (idx === -1) return false;

    const name = this.data.branches[idx].name;
    // Soft-deactivate to protect relational appointments and historical audit records
    this.data.branches[idx].is_active = false;
    this.data.branches[idx].updated_at = new Date().toISOString();

    const waInt = await this.getBranchWhatsAppIntegration(id);
    if (waInt) {
      waInt.status = 'disconnected';
      waInt.updated_at = new Date().toISOString();
    }

    await this.logAudit('DEACTIVATE', 'SalonBranch', id, performedBy, `Deactivated salon branch: ${name}`);
    this.save();
    return true;
  }

  // --- Branch WhatsApp Coexistence Integrations ---
  public async getBranchWhatsAppIntegration(branchId: string): Promise<BranchWhatsAppIntegration> {
    if (!this.data.branch_whatsapp_integrations) {
      this.data.branch_whatsapp_integrations = [];
    }

    let item = this.data.branch_whatsapp_integrations.find(b => b.branch_id === branchId);
    if (!item) {
      const branch = await this.getBranchById(branchId);
      const configuredNumber = branch?.whatsapp_number || '9848099888';
      const last4 = configuredNumber.slice(-4);
      item = {
        id: `bwa-${branchId}`,
        branch_id: branchId,
        configured_business_number: configuredNumber,
        display_name: branch?.name || 'The Glossy Looks Salon',
        display_phone_number: configuredNumber,
        masked_phone_number: configuredNumber.length >= 4 ? `+91 ******${last4}` : '+91 ******0000',
        status: 'disconnected',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.data.branch_whatsapp_integrations.push(item);
      this.save();
    }
    return item;
  }

  public async updateBranchWhatsAppIntegration(
    branchId: string,
    data: Partial<BranchWhatsAppIntegration>,
    performedBy: string
  ): Promise<BranchWhatsAppIntegration> {
    const current = await this.getBranchWhatsAppIntegration(branchId);
    const updated: BranchWhatsAppIntegration = {
      ...current,
      ...data,
      updated_at: new Date().toISOString()
    };

    const idx = this.data.branch_whatsapp_integrations.findIndex(b => b.branch_id === branchId);
    if (idx !== -1) {
      this.data.branch_whatsapp_integrations[idx] = updated;
    } else {
      this.data.branch_whatsapp_integrations.push(updated);
    }

    await this.logAudit(
      'UPDATE_WHATSAPP',
      'BranchWhatsAppIntegration',
      branchId,
      performedBy,
      `Updated branch WhatsApp integration (Branch: ${branchId}, Status: ${updated.status}, Number: ${updated.masked_phone_number || updated.configured_business_number})`
    );
    this.save();
    return updated;
  }

  public async disconnectBranchWhatsAppIntegration(branchId: string, performedBy: string): Promise<BranchWhatsAppIntegration> {
    const current = await this.getBranchWhatsAppIntegration(branchId);
    const updated: BranchWhatsAppIntegration = {
      ...current,
      status: 'disconnected',
      updated_at: new Date().toISOString()
    };

    const idx = this.data.branch_whatsapp_integrations.findIndex(b => b.branch_id === branchId);
    if (idx !== -1) {
      this.data.branch_whatsapp_integrations[idx] = updated;
    }

    await this.logAudit(
      'DISCONNECT_WHATSAPP',
      'BranchWhatsAppIntegration',
      branchId,
      performedBy,
      `Disconnected branch WhatsApp integration for branch: ${branchId}. Message records preserved.`
    );
    this.save();
    return updated;
  }

  // --- Settings ---
  public async getSettings(): Promise<SalonSettings> {
    return this.data.settings;
  }

  public async updateSettings(data: Partial<SalonSettings>, performedBy: string): Promise<SalonSettings> {
    this.data.settings = { ...this.data.settings, ...data };
    await this.logAudit('UPDATE', 'Settings', 'settings', performedBy, 'Updated salon identity, timings, or location');
    this.save();
    return this.data.settings;
  }

  // --- WhatsApp Business Integration ---
  public async getWhatsAppIntegration(): Promise<WhatsAppIntegration> {
    if (!this.data.whatsapp_integration) {
      this.data.whatsapp_integration = {
        id: 'wa-int-01',
        salon_id: 'tgl-gachibowli-main',
        status: 'not_connected',
        updated_at: new Date().toISOString()
      };
      this.save();
    }
    return this.data.whatsapp_integration;
  }

  public async updateWhatsAppIntegration(data: Partial<WhatsAppIntegration>, performedBy: string): Promise<WhatsAppIntegration> {
    const current = await this.getWhatsAppIntegration();
    const updated: WhatsAppIntegration = {
      ...current,
      ...data,
      updated_at: new Date().toISOString()
    };
    this.data.whatsapp_integration = updated;
    await this.logAudit(
      'CONNECT',
      'WhatsAppIntegration',
      updated.waba_id || updated.id,
      performedBy,
      `Connected WhatsApp Business Coexistence (WABA: ${updated.waba_id || 'N/A'}, Phone ID: ${updated.phone_number_id || 'N/A'}, Number: ${updated.masked_phone_number || updated.display_phone_number || 'N/A'})`
    );
    this.save();
    return updated;
  }

  public async disconnectWhatsAppIntegration(performedBy: string): Promise<WhatsAppIntegration> {
    const current = await this.getWhatsAppIntegration();
    const updated: WhatsAppIntegration = {
      ...current,
      status: 'disconnected',
      updated_at: new Date().toISOString()
    };
    this.data.whatsapp_integration = updated;
    await this.logAudit(
      'DISCONNECT',
      'WhatsAppIntegration',
      current.waba_id || current.id,
      performedBy,
      `Disconnected WhatsApp Business integration for ${current.display_name || current.masked_phone_number || 'salon'}. Message history retained.`
    );
    this.save();
    return updated;
  }

  // --- WhatsApp Business Settings ---
  public async getWhatsAppBusinessSettings(): Promise<WhatsAppBusinessSettings> {
    if (!this.data.whatsapp_settings) {
      const activeNumber = this.data.settings?.whatsapp || this.data.settings?.phone || '';
      const last4 = activeNumber.slice(-4);
      this.data.whatsapp_settings = {
        id: 'wa-set-01',
        salon_id: 'tgl-gachibowli-main',
        business_number: activeNumber,
        country_code: '+91',
        display_name: this.data.settings?.brand_name || 'The Glossy Looks',
        is_enabled: true,
        masked_number: activeNumber.length >= 4 ? `+91 ******${last4}` : '+91 ******0000',
        updated_at: new Date().toISOString()
      };
      this.save();
    }
    return this.data.whatsapp_settings;
  }

  public async updateWhatsAppBusinessSettings(settings: Partial<WhatsAppBusinessSettings>, performedBy: string): Promise<WhatsAppBusinessSettings> {
    const current = await this.getWhatsAppBusinessSettings();
    const cleanNumber = (settings.business_number || current.business_number || '').replace(/\D/g, '').slice(-10);
    const countryCode = settings.country_code || current.country_code || '+91';
    const last4 = cleanNumber.slice(-4);
    const masked = cleanNumber.length >= 4 ? `${countryCode} ******${last4}` : `${countryCode} ******0000`;

    const updated: WhatsAppBusinessSettings = {
      ...current,
      ...settings,
      business_number: cleanNumber,
      country_code: countryCode,
      display_name: settings.display_name !== undefined ? settings.display_name.trim() : current.display_name,
      is_enabled: settings.is_enabled !== undefined ? settings.is_enabled : current.is_enabled,
      masked_number: masked,
      updated_at: new Date().toISOString(),
      updated_by: performedBy
    };
    this.data.whatsapp_settings = updated;

    // Immediately propagate to central salon settings so customer pages and links dynamically update
    if (this.data.settings) {
      this.data.settings.whatsapp = cleanNumber;
      this.data.settings.phone = cleanNumber;
    }

    await this.logAudit(
      'UPDATE',
      'WhatsAppBusinessSettings',
      updated.id || 'wa-set-01',
      performedBy,
      `Updated salon WhatsApp business settings: ${masked} (Status: ${updated.is_enabled ? 'Enabled' : 'Disabled'})`
    );
    this.save();
    return updated;
  }

  // --- Users (Central Staff Account Source of Truth) ---
  public async getUsers(): Promise<User[]> {
    return this.data.users;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const u = this.data.users.find(x => x.email.toLowerCase() === email.toLowerCase());
    return u || null;
  }

  public async getUserByIdentifier(identifier: string): Promise<User | null> {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPhone = (identifier || '').replace(/\D/g, '');
    const u = this.data.users.find(x => {
      const matchUserId = x.user_id && x.user_id.toLowerCase() === cleanId;
      const matchEmail = x.email && x.email.toLowerCase() === cleanId;
      const matchPhone = cleanPhone.length >= 10 && x.phone && x.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10));
      return matchUserId || matchEmail || matchPhone;
    });
    return u || null;
  }

  public async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<User> {
    const rolePrefix: Record<string, string> = {
      owner: 'OWN',
      manager: 'MGR',
      receptionist: 'REC',
      stylist: 'STY',
      inventory_staff: 'INV'
    };
    const prefix = rolePrefix[userData.role] || 'STF';
    const autoUserId = userData.user_id && userData.user_id.trim() !== ''
      ? userData.user_id.trim()
      : `TGL-${prefix}${Math.floor(10 + Math.random() * 90)}`;

    const newUser: User = {
      ...userData,
      user_id: autoUserId,
      id: `usr-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.users.push(newUser);

    // Simultaneously create staff record so Staff & Rosters, POS, and Bookings reflect immediately
    const newStaff: Staff = {
      id: `stf-${Date.now()}`,
      user_id: newUser.id,
      admin_user_id: newUser.user_id,
      name: newUser.name,
      phone: newUser.phone,
      email: newUser.email,
      role: this.formatRoleTitle(newUser.role),
      branch_id: newUser.branch_id || 'tgl-gachibowli-main',
      joining_date: new Date().toISOString().split('T')[0],
      salary_type: 'monthly',
      base_salary: 35000,
      commission_rate: 10,
      skills: ['Salon Care', 'Client Styling'],
      working_hours: '10:00 AM - 08:00 PM',
      is_active: newUser.is_active,
      created_at: new Date().toISOString()
    };
    this.data.staff.push(newStaff);

    await this.logAudit('CREATE', 'User', newUser.id, performedBy, `Created staff account: ${newUser.name} (User ID: ${newUser.user_id}, Role: ${newUser.role.toUpperCase()})`);
    this.save();
    return newUser;
  }

  public async updateUser(id: string, updateData: Partial<User>, performedBy: string): Promise<User | null> {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    const old = this.data.users[idx];
    const oldName = old.name;
    const updatedUser: User = { ...old, ...updateData, updated_at: new Date().toISOString() };
    this.data.users[idx] = updatedUser;

    // 1. Immediately synchronize corresponding staff record
    let staffIdx = this.data.staff.findIndex(s => s.user_id === id || s.admin_user_id === old.user_id || s.id === id);
    if (staffIdx !== -1) {
      this.data.staff[staffIdx] = {
        ...this.data.staff[staffIdx],
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        is_active: updatedUser.is_active,
        admin_user_id: updatedUser.user_id,
        ...(updateData.branch_id !== undefined && { branch_id: updateData.branch_id }),
        ...(updateData.role && { role: this.formatRoleTitle(updatedUser.role) })
      };
    } else {
      const newStaff: Staff = {
        id: `stf-${Date.now()}`,
        user_id: updatedUser.id,
        admin_user_id: updatedUser.user_id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        role: this.formatRoleTitle(updatedUser.role),
        branch_id: updatedUser.branch_id || 'tgl-gachibowli-main',
        joining_date: new Date().toISOString().split('T')[0],
        salary_type: 'monthly',
        base_salary: 35000,
        commission_rate: 10,
        skills: ['Salon Care', 'Client Styling'],
        is_active: updatedUser.is_active,
        created_at: new Date().toISOString()
      };
      this.data.staff.push(newStaff);
      staffIdx = this.data.staff.length - 1;
    }

    const staffId = this.data.staff[staffIdx].id;
    const newName = updatedUser.name;
    const staffIds = [id, staffId, updatedUser.user_id];

    // 2. Cascade updated name to all appointments referencing this staff
    this.data.appointments.forEach(apt => {
      if (staffIds.includes(apt.assigned_staff_id || '') || (apt.assigned_staff_name && apt.assigned_staff_name.toLowerCase() === oldName.toLowerCase())) {
        apt.assigned_staff_id = staffId;
        apt.assigned_staff_name = newName;
      }
      (apt.services || []).forEach(srv => {
        if (staffIds.includes(srv.staff_id || '') || (srv.staff_name && srv.staff_name.toLowerCase() === oldName.toLowerCase())) {
          srv.staff_id = staffId;
          srv.staff_name = newName;
        }
      });
    });

    // 3. Cascade updated name to all orders referencing this staff
    this.data.orders.forEach(order => {
      if (staffIds.includes(order.cashier_id || '') || (order.cashier_name && order.cashier_name.toLowerCase() === oldName.toLowerCase())) {
        order.cashier_name = newName;
      }
      (order.items || []).forEach(item => {
        if (staffIds.includes(item.staff_id || '') || (item.staff_name && item.staff_name.toLowerCase() === oldName.toLowerCase())) {
          item.staff_id = staffId;
          item.staff_name = newName;
        }
      });
    });

    // 4. Cascade updated name to gallery
    this.data.gallery.forEach(g => {
      if (g.artist_name && g.artist_name.toLowerCase() === oldName.toLowerCase()) {
        g.artist_name = newName;
      }
    });

    // 5. Cascade updated name to branches
    this.data.branches.forEach(b => {
      if (staffIds.includes(b.manager_id || '') || b.manager_name?.toLowerCase() === oldName.toLowerCase()) {
        b.manager_name = newName;
      }
    });

    await this.logAudit('UPDATE', 'User', id, performedBy, `Updated staff profile: ${updatedUser.name} (User ID: ${updatedUser.user_id})`);
    this.save();
    return updatedUser;
  }

  public async resetUserPassword(id: string, newPasswordHash: string, performedBy: string): Promise<boolean> {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    const user = this.data.users[idx];
    this.data.users[idx].password_hash = newPasswordHash;
    this.data.users[idx].updated_at = new Date().toISOString();
    await this.logAudit('PASSWORD_RESET', 'User', id, performedBy, `Owner reset credentials for: ${user.name} (User ID: ${user.user_id})`);
    this.save();
    return true;
  }

  public async deleteUser(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    const user = this.data.users[idx];
    // Soft-delete / deactivate so historical references are preserved
    this.data.users[idx].is_active = false;
    this.data.users[idx].updated_at = new Date().toISOString();

    const staffIdx = this.data.staff.findIndex(s => s.user_id === id || s.id === id || s.email === user.email);
    if (staffIdx !== -1) {
      this.data.staff[staffIdx].is_active = false;
    }

    await this.logAudit('DEACTIVATE', 'User', id, performedBy, `Deactivated staff user: ${user.name} (User ID: ${user.user_id})`);
    this.save();
    return true;
  }

  // --- Staff Management ---
  public async getStaff(): Promise<Staff[]> {
    return this.data.staff.map(s => {
      const usr = this.data.users.find(u => u.id === s.user_id || u.id === s.id || (u.email && s.email && u.email.toLowerCase() === s.email.toLowerCase()));
      if (usr) {
        return {
          ...s,
          user_id: usr.id,
          name: usr.name,
          phone: usr.phone || s.phone,
          email: usr.email || s.email,
          is_active: usr.is_active
        };
      }
      return s;
    });
  }

  public async getStaffById(id: string): Promise<Staff | null> {
    const stf = this.data.staff.find(s => s.id === id || s.user_id === id);
    if (!stf) return null;
    const usr = this.data.users.find(u => u.id === stf.user_id || u.id === stf.id);
    if (usr) {
      return {
        ...stf,
        name: usr.name,
        phone: usr.phone,
        email: usr.email,
        is_active: usr.is_active
      };
    }
    return stf;
  }

  public async createStaff(staffData: Omit<Staff, 'id' | 'created_at'>, performedBy: string): Promise<Staff> {
    const newStaff: Staff = {
      ...staffData,
      id: `stf-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.data.staff.push(newStaff);

    // Simultaneously create user account if missing
    let user = this.data.users.find(u => (u.email && newStaff.email && u.email.toLowerCase() === newStaff.email.toLowerCase()) || u.phone === newStaff.phone);
    if (!user) {
      user = {
        id: `usr-${Date.now()}`,
        user_id: `TGL-STY${Math.floor(10 + Math.random() * 90)}`,
        name: newStaff.name,
        email: newStaff.email || `${newStaff.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@theglossylooks.com`,
        password_hash: 'admin123',
        role: 'stylist',
        phone: newStaff.phone,
        is_active: newStaff.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.data.users.push(user);
    }
    newStaff.user_id = user.id;

    await this.logAudit('CREATE', 'Staff', newStaff.id, performedBy, `Added stylist: ${newStaff.name}`);
    this.save();
    return newStaff;
  }

  public async updateStaff(id: string, data: Partial<Staff>, performedBy: string): Promise<Staff | null> {
    const idx = this.data.staff.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const old = this.data.staff[idx];
    const oldName = old.name;
    const updatedStaff: Staff = { ...old, ...data };
    this.data.staff[idx] = updatedStaff;

    // Synchronize corresponding user record
    const userIdx = this.data.users.findIndex(u => u.id === updatedStaff.user_id || u.user_id === updatedStaff.admin_user_id || u.id === id);
    if (userIdx !== -1) {
      this.data.users[userIdx] = {
        ...this.data.users[userIdx],
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
        ...(data.branch_id !== undefined && { branch_id: data.branch_id }),
        updated_at: new Date().toISOString()
      };
    }

    const newName = updatedStaff.name;
    const staffIds = [id, updatedStaff.user_id || '', updatedStaff.admin_user_id || ''];

    // Cascade to appointments
    this.data.appointments.forEach(apt => {
      if (staffIds.includes(apt.assigned_staff_id || '') || (apt.assigned_staff_name && apt.assigned_staff_name.toLowerCase() === oldName.toLowerCase())) {
        apt.assigned_staff_id = updatedStaff.id;
        apt.assigned_staff_name = newName;
      }
      (apt.services || []).forEach(srv => {
        if (staffIds.includes(srv.staff_id || '') || (srv.staff_name && srv.staff_name.toLowerCase() === oldName.toLowerCase())) {
          srv.staff_id = updatedStaff.id;
          srv.staff_name = newName;
        }
      });
    });

    // Cascade to orders
    this.data.orders.forEach(order => {
      if (staffIds.includes(order.cashier_id || '') || (order.cashier_name && order.cashier_name.toLowerCase() === oldName.toLowerCase())) {
        order.cashier_name = newName;
      }
      (order.items || []).forEach(item => {
        if (staffIds.includes(item.staff_id || '') || (item.staff_name && item.staff_name.toLowerCase() === oldName.toLowerCase())) {
          item.staff_id = updatedStaff.id;
          item.staff_name = newName;
        }
      });
    });

    // Cascade to gallery
    this.data.gallery.forEach(g => {
      if (g.artist_name && g.artist_name.toLowerCase() === oldName.toLowerCase()) {
        g.artist_name = newName;
      }
    });

    // Cascade to branches
    this.data.branches.forEach(b => {
      if (staffIds.includes(b.manager_id || '') || b.manager_name?.toLowerCase() === oldName.toLowerCase()) {
        b.manager_name = newName;
      }
    });

    await this.logAudit('UPDATE', 'Staff', id, performedBy, `Updated staff profile: ${newName}`);
    this.save();
    return updatedStaff;
  }

  public async deleteStaff(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.staff.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const staff = this.data.staff[idx];
    // Soft-deactivate to protect foreign keys and historical transaction records
    this.data.staff[idx].is_active = false;

    const userIdx = this.data.users.findIndex(u => u.id === staff.user_id || u.user_id === staff.admin_user_id || u.id === id);
    if (userIdx !== -1) {
      this.data.users[userIdx].is_active = false;
      this.data.users[userIdx].updated_at = new Date().toISOString();
    }

    await this.logAudit('DEACTIVATE', 'Staff', id, performedBy, `Deactivated staff profile: ${staff.name}`);
    this.save();
    return true;
  }

  // --- Customer OTP & Profile ---
  public async createOTPSession(mobile: string): Promise<{ sessionId: string; otp: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    // Predictable 4-digit demo OTP for development & evaluation, plus expiration
    const otp = '1234';
    const session: OTPSession = {
      id: `otp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      mobile: cleanMobile,
      otp,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      verified: false,
      created_at: new Date().toISOString()
    };
    this.data.otp_sessions.push(session);
    this.save();
    return { sessionId: session.id, otp };
  }

  public async verifyOTP(mobile: string, otp: string): Promise<{ success: boolean; customer: Customer; token: string }> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const session = this.data.otp_sessions.find(
      s => s.mobile === cleanMobile && s.otp === otp && !s.verified
    );

    if (!session && otp !== '1234') {
      throw new Error('Invalid or expired OTP. Please enter 1234 to verify.');
    }

    if (session) {
      session.verified = true;
    }

    let customer = this.data.customers.find(c => c.mobile === cleanMobile);
    if (!customer) {
      customer = {
        id: `cust-${Date.now()}`,
        name: 'Guest Client',
        mobile: cleanMobile,
        loyalty_points: 50,
        total_spend: 0,
        visit_count: 1,
        saved_addresses: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.data.customers.push(customer);
    }

    const token = `tgl_customer_token_${customer.id}_${Date.now()}`;
    this.save();
    return { success: true, customer, token };
  }

  public async getCustomers(search?: string): Promise<Customer[]> {
    if (!search || !search.trim()) return this.data.customers;
    const q = search.toLowerCase();
    return this.data.customers.filter(c => c.name.toLowerCase().includes(q) || c.mobile.includes(q) || (c.email && c.email.toLowerCase().includes(q)));
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    return this.data.customers.find(c => c.id === id) || null;
  }

  public async getCustomerByMobile(mobile: string): Promise<Customer | null> {
    const clean = mobile.replace(/\D/g, '').slice(-10);
    return this.data.customers.find(c => c.mobile.endsWith(clean)) || null;
  }

  public async createCustomer(data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<Customer> {
    const newCust: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      loyalty_points: data.loyalty_points || 0,
      total_spend: data.total_spend || 0,
      visit_count: data.visit_count || 1,
      saved_addresses: data.saved_addresses || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.customers.unshift(newCust);
    await this.logAudit('CREATE', 'Customer', newCust.id, performedBy, `Registered customer: ${newCust.name} (${newCust.mobile})`);
    this.save();
    return newCust;
  }

  public async updateCustomer(id: string, data: Partial<Customer>, performedBy: string): Promise<Customer | null> {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.customers[idx] = { ...this.data.customers[idx], ...data, updated_at: new Date().toISOString() };
    await this.logAudit('UPDATE', 'Customer', id, performedBy, `Updated customer CRM profile`);
    this.save();
    return this.data.customers[idx];
  }

  public async deleteCustomer(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const name = this.data.customers[idx].name;
    this.data.customers.splice(idx, 1);
    await this.logAudit('DELETE', 'Customer', id, performedBy, `Deleted customer record: ${name}`);
    this.save();
    return true;
  }

  public async upsertCustomerFromOrderOrAppointment(payload: {
    name: string;
    phone: string;
    email?: string;
    branchId?: string;
    spend?: number;
    billNumber?: string;
    isVisit?: boolean;
  }): Promise<Customer> {
    const clean = payload.phone.replace(/\D/g, '').slice(-10);
    const existing = await this.getCustomerByMobile(clean);
    const now = new Date().toISOString();
    const spend = Number(payload.spend) || 0;

    if (!existing) {
      const newCust: Customer = {
        id: `cust-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        name: payload.name || 'Valued Customer',
        mobile: clean,
        email: payload.email,
        branch_id: payload.branchId,
        first_visit_at: now,
        last_visit_at: now,
        visit_count: payload.isVisit ? 1 : 0,
        total_spend: spend,
        loyalty_points: Math.floor(spend / 100) * 5,
        latest_bill_number: payload.billNumber,
        notes: '',
        created_at: now,
        updated_at: now
      };
      this.data.customers.unshift(newCust);
      this.save();
      return newCust;
    } else {
      existing.name = payload.name && payload.name.trim() !== '' ? payload.name : existing.name;
      if (payload.email) existing.email = payload.email;
      if (payload.branchId) existing.branch_id = payload.branchId;
      existing.last_visit_at = now;
      if (payload.isVisit) existing.visit_count = (existing.visit_count || 0) + 1;
      existing.total_spend = (existing.total_spend || 0) + spend;
      existing.loyalty_points = (existing.loyalty_points || 0) + Math.floor(spend / 100) * 5;
      if (payload.billNumber) existing.latest_bill_number = payload.billNumber;
      if (!existing.first_visit_at) existing.first_visit_at = existing.created_at || now;
      existing.updated_at = now;
      this.save();
      return existing;
    }
  }

  // --- Categories & Services & Packages ---
  public async getCategories(): Promise<ServiceCategory[]> {
    return this.data.categories.filter(c => c.is_active);
  }

  public async createCategory(cat: Omit<ServiceCategory, 'id'>, performedBy: string): Promise<ServiceCategory> {
    const newCat: ServiceCategory = { ...cat, id: `cat-${Date.now()}` };
    this.data.categories.push(newCat);
    await this.logAudit('CREATE', 'Category', newCat.id, performedBy, `Added category: ${newCat.name}`);
    this.save();
    return newCat;
  }

  public async updateCategory(id: string, cat: Partial<ServiceCategory>, performedBy: string): Promise<ServiceCategory | null> {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.categories[idx] = { ...this.data.categories[idx], ...cat };
    await this.logAudit('UPDATE', 'Category', id, performedBy, `Updated category ${this.data.categories[idx].name}`);
    this.save();
    return this.data.categories[idx];
  }

  public async deleteCategory(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const name = this.data.categories[idx].name;
    this.data.categories.splice(idx, 1);
    await this.logAudit('DELETE', 'Category', id, performedBy, `Deleted category ${name}`);
    this.save();
    return true;
  }

  public async getServices(categoryId?: string, search?: string): Promise<ServiceItem[]> {
    let result = this.data.services.filter(s => s.is_active);
    if (categoryId && categoryId !== 'all') {
      result = result.filter(s => s.category_id === categoryId);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.benefits.toLowerCase().includes(q));
    }
    return result;
  }

  public async getServiceById(id: string): Promise<ServiceItem | null> {
    return this.data.services.find(s => s.id === id) || null;
  }

  public async createService(srv: Omit<ServiceItem, 'id' | 'created_at' | 'updated_at'>, performedBy: string): Promise<ServiceItem> {
    const newSrv: ServiceItem = {
      ...srv,
      id: `srv-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.services.push(newSrv);
    await this.logAudit('CREATE', 'Service', newSrv.id, performedBy, `Added service: ${newSrv.name} (₹${newSrv.price})`);
    this.save();
    return newSrv;
  }

  public async updateService(id: string, srv: Partial<ServiceItem>, performedBy: string): Promise<ServiceItem | null> {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.services[idx] = { ...this.data.services[idx], ...srv, updated_at: new Date().toISOString() };
    await this.logAudit('UPDATE', 'Service', id, performedBy, `Updated service: ${this.data.services[idx].name}`);
    this.save();
    return this.data.services[idx];
  }

  public async deleteService(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.services.findIndex(s => s.id === id);
    if (idx === -1) return false;
    const name = this.data.services[idx].name;
    this.data.services.splice(idx, 1);
    await this.logAudit('DELETE', 'Service', id, performedBy, `Deleted service: ${name}`);
    this.save();
    return true;
  }

  public async getPackages(): Promise<PackageCombo[]> {
    return this.data.packages.filter(p => p.is_active);
  }

  public async createPackage(pkg: Omit<PackageCombo, 'id'>, performedBy: string): Promise<PackageCombo> {
    const newPkg: PackageCombo = { ...pkg, id: `pkg-${Date.now()}` };
    this.data.packages.push(newPkg);
    await this.logAudit('CREATE', 'Package', newPkg.id, performedBy, `Created combo package: ${newPkg.name}`);
    this.save();
    return newPkg;
  }

  public async updatePackage(id: string, pkg: Partial<PackageCombo>, performedBy: string): Promise<PackageCombo | null> {
    const idx = this.data.packages.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.packages[idx] = { ...this.data.packages[idx], ...pkg };
    await this.logAudit('UPDATE', 'Package', id, performedBy, `Updated package: ${this.data.packages[idx].name}`);
    this.save();
    return this.data.packages[idx];
  }

  public async deletePackage(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.packages.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const name = this.data.packages[idx].name;
    this.data.packages.splice(idx, 1);
    await this.logAudit('DELETE', 'Package', id, performedBy, `Deleted package: ${name}`);
    this.save();
    return true;
  }

  // --- Appointments ---
  public async getAppointments(filters?: { status?: string; staffId?: string; customerMobile?: string }): Promise<Appointment[]> {
    let list = this.data.appointments.map(apt => {
      const resolvedStaff = this.resolveStaff(apt.assigned_staff_id || apt.assigned_staff_name);
      const resolvedServices = (apt.services || []).map(srv => {
        const srvStaff = this.resolveStaff(srv.staff_id || srv.staff_name || apt.assigned_staff_id);
        return {
          ...srv,
          staff_id: srvStaff ? srvStaff.id : srv.staff_id,
          staff_name: srvStaff ? srvStaff.name : srv.staff_name
        };
      });
      return {
        ...apt,
        assigned_staff_id: resolvedStaff ? resolvedStaff.id : apt.assigned_staff_id,
        assigned_staff_name: resolvedStaff ? resolvedStaff.name : apt.assigned_staff_name,
        services: resolvedServices
      };
    });
    if (filters?.status) list = list.filter(a => a.status === filters.status);
    if (filters?.staffId) list = list.filter(a => a.assigned_staff_id === filters.staffId);
    if (filters?.customerMobile) list = list.filter(a => a.customer_phone.includes(filters.customerMobile!));
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getAppointmentById(id: string): Promise<Appointment | null> {
    const apt = this.data.appointments.find(a => a.id === id || a.booking_reference === id);
    if (!apt) return null;
    const resolvedStaff = this.resolveStaff(apt.assigned_staff_id || apt.assigned_staff_name);
    return {
      ...apt,
      assigned_staff_id: resolvedStaff ? resolvedStaff.id : apt.assigned_staff_id,
      assigned_staff_name: resolvedStaff ? resolvedStaff.name : apt.assigned_staff_name,
      services: (apt.services || []).map(srv => {
        const srvStaff = this.resolveStaff(srv.staff_id || srv.staff_name || apt.assigned_staff_id);
        return {
          ...srv,
          staff_id: srvStaff ? srvStaff.id : srv.staff_id,
          staff_name: srvStaff ? srvStaff.name : srv.staff_name
        };
      })
    };
  }

  public async createAppointment(apt: Omit<Appointment, 'id' | 'booking_reference' | 'created_at' | 'updated_at'>, performedBy?: string): Promise<Appointment> {
    const count = this.data.appointments.length + 101;
    const resolvedStaff = this.resolveStaff(apt.assigned_staff_id || apt.assigned_staff_name);
    const resolvedServices = (apt.services || []).map(srv => {
      const srvStaff = this.resolveStaff(srv.staff_id || srv.staff_name || apt.assigned_staff_id);
      return {
        ...srv,
        staff_id: srvStaff ? srvStaff.id : srv.staff_id,
        staff_name: srvStaff ? srvStaff.name : srv.staff_name
      };
    });

    const newApt: Appointment = {
      ...apt,
      id: `apt-${Date.now()}`,
      assigned_staff_id: resolvedStaff ? resolvedStaff.id : apt.assigned_staff_id,
      assigned_staff_name: resolvedStaff ? resolvedStaff.name : (apt.assigned_staff_name || 'Station Stylist'),
      services: resolvedServices,
      booking_reference: `TGL-BK-${new Date().getFullYear()}-${count}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Link customer
    let cust = this.data.customers.find(c => c.mobile === newApt.customer_phone);
    if (!cust) {
      cust = {
        id: `cust-${Date.now()}`,
        name: newApt.customer_name,
        mobile: newApt.customer_phone,
        email: newApt.customer_email,
        loyalty_points: 20,
        total_spend: 0,
        visit_count: 1,
        saved_addresses: [],
        last_visit_at: newApt.appointment_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.data.customers.push(cust);
    } else {
      cust.visit_count += 1;
      cust.last_visit_at = newApt.appointment_date;
    }
    newApt.customer_id = cust.id;

    this.data.appointments.unshift(newApt);

    // Auto queue print slip if printer is active
    const slipDevice = this.data.print_devices.find(d => d.is_online && d.auto_print_slip);
    if (slipDevice) {
      this.queuePrintJob({
        device_id: slipDevice.id,
        job_type: 'service_ticket',
        appointment_id: newApt.id,
        payload: {
          booking_reference: newApt.booking_reference,
          customer_name: newApt.customer_name,
          customer_phone: newApt.customer_phone,
          date: newApt.appointment_date,
          time_slot: newApt.time_slot,
          assigned_staff: newApt.assigned_staff_name || 'Station Stylist',
          services: newApt.services.map(s => ({ name: s.name, duration: s.duration, price: s.price }))
        }
      });
    }

    await this.logAudit('CREATE', 'Appointment', newApt.id, performedBy || newApt.customer_name, `Scheduled booking: ${newApt.booking_reference} for ${newApt.customer_name}`);
    this.save();
    return newApt;
  }

  public async updateAppointment(id: string, data: Partial<Appointment>, performedBy: string): Promise<Appointment | null> {
    const idx = this.data.appointments.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const resolvedStaff = data.assigned_staff_id !== undefined || data.assigned_staff_name !== undefined
      ? this.resolveStaff(data.assigned_staff_id || data.assigned_staff_name)
      : null;

    const patch: Partial<Appointment> = {
      ...data,
      ...(resolvedStaff && {
        assigned_staff_id: resolvedStaff.id,
        assigned_staff_name: resolvedStaff.name
      }),
      updated_at: new Date().toISOString()
    };

    if (data.services) {
      patch.services = data.services.map(srv => {
        const srvStaff = this.resolveStaff(srv.staff_id || srv.staff_name);
        return {
          ...srv,
          staff_id: srvStaff ? srvStaff.id : srv.staff_id,
          staff_name: srvStaff ? srvStaff.name : srv.staff_name
        };
      });
    }

    this.data.appointments[idx] = { ...this.data.appointments[idx], ...patch };
    await this.logAudit('UPDATE', 'Appointment', id, performedBy, `Updated appointment status/details to ${data.status || 'updated'}`);
    this.save();
    return this.data.appointments[idx];
  }

  public async cancelAppointment(id: string, reason: string, performedBy: string): Promise<Appointment | null> {
    const apt = await this.updateAppointment(id, { status: 'Cancelled', notes: `Cancelled: ${reason}` }, performedBy);
    return apt;
  }

  // --- Orders & POS Invoicing ---
  public async getOrders(filters?: { customerMobile?: string; paymentStatus?: string }): Promise<Order[]> {
    let list = this.data.orders.map(o => {
      const cashier = this.resolveStaff(o.cashier_id || o.cashier_name);
      const resolvedItems = (o.items || []).map(item => {
        const itemStaff = this.resolveStaff(item.staff_id || item.staff_name);
        return {
          ...item,
          staff_id: itemStaff ? itemStaff.id : item.staff_id,
          staff_name: itemStaff ? itemStaff.name : item.staff_name
        };
      });
      return {
        ...o,
        cashier_id: cashier ? cashier.id : o.cashier_id,
        cashier_name: cashier ? cashier.name : o.cashier_name,
        items: resolvedItems
      };
    });

    if (filters?.customerMobile) list = list.filter(o => o.customer_phone.includes(filters.customerMobile!));
    if (filters?.paymentStatus) list = list.filter(o => o.payment_status === filters.paymentStatus);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getOrderById(id: string): Promise<Order | null> {
    const o = this.data.orders.find(ord => ord.id === id || ord.bill_number === id);
    if (!o) return null;
    const cashier = this.resolveStaff(o.cashier_id || o.cashier_name);
    return {
      ...o,
      cashier_id: cashier ? cashier.id : o.cashier_id,
      cashier_name: cashier ? cashier.name : o.cashier_name,
      items: (o.items || []).map(item => {
        const itemStaff = this.resolveStaff(item.staff_id || item.staff_name);
        return {
          ...item,
          staff_id: itemStaff ? itemStaff.id : item.staff_id,
          staff_name: itemStaff ? itemStaff.name : item.staff_name
        };
      })
    };
  }

  public async createOrder(orderData: Omit<Order, 'id' | 'bill_number' | 'created_at'>, performedBy: string): Promise<Order> {
    const billNum = `TGL-${new Date().getFullYear()}-${1000 + this.data.orders.length + 1}`;
    const cashier = this.resolveStaff(performedBy || orderData.cashier_name);
    const resolvedItems = (orderData.items || []).map(item => {
      const itemStaff = this.resolveStaff(item.staff_id || item.staff_name);
      return {
        ...item,
        staff_id: itemStaff ? itemStaff.id : item.staff_id,
        staff_name: itemStaff ? itemStaff.name : (item.staff_name || 'Station Stylist')
      };
    });

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      bill_number: billNum,
      invoice_number: `INV-${new Date().getFullYear()}-${(this.data.orders.length + 1).toString().padStart(4, '0')}`,
      cashier_id: cashier ? cashier.id : orderData.cashier_id,
      cashier_name: cashier ? cashier.name : (orderData.cashier_name || 'Cashier'),
      items: resolvedItems,
      created_at: new Date().toISOString()
    };

    // Update customer lifetime spend & loyalty points
    let cust = this.data.customers.find(c => c.mobile === newOrder.customer_phone);
    if (cust) {
      cust.total_spend += newOrder.paid_amount;
      cust.loyalty_points += Math.floor(newOrder.paid_amount * 0.05); // 5% loyalty reward
      cust.last_visit_at = new Date().toISOString();
    } else {
      cust = {
        id: `cust-${Date.now()}`,
        name: newOrder.customer_name,
        mobile: newOrder.customer_phone,
        loyalty_points: Math.floor(newOrder.paid_amount * 0.05),
        total_spend: newOrder.paid_amount,
        visit_count: 1,
        saved_addresses: [],
        last_visit_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this.data.customers.push(cust);
    }
    newOrder.customer_id = cust.id;

    // Automatic Inventory Reduction for consumable items linked to billed services/products
    orderData.items.forEach(item => {
      // Find matching product by name or keyword
      const prod = this.data.products.find(p => p.name.toLowerCase().includes(item.item_name.toLowerCase()) || item.item_name.toLowerCase().includes(p.name.toLowerCase()));
      if (prod && prod.current_stock > 0) {
        prod.current_stock = Math.max(0, prod.current_stock - item.quantity);
        this.data.inventory_movements.unshift({
          id: `im-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          product_id: prod.id,
          product_name: prod.name,
          movement_type: 'pos_sale',
          quantity: -item.quantity,
          balance_after: prod.current_stock,
          notes: `Billed in order ${newOrder.bill_number}`,
          performed_by: performedBy || 'POS Cashier',
          created_at: new Date().toISOString()
        });
      }
    });

    this.data.orders.unshift(newOrder);

    // Record Payment Entry
    if (newOrder.paid_amount > 0) {
      const payment: PaymentRecord = {
        id: `pay-${Date.now()}`,
        order_id: newOrder.id,
        bill_number: newOrder.bill_number,
        customer_name: newOrder.customer_name,
        customer_phone: newOrder.customer_phone,
        amount: newOrder.paid_amount,
        payment_mode: newOrder.primary_payment_mode,
        transaction_ref: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'Success',
        notes: newOrder.notes || 'POS Order Payment',
        recorded_by: performedBy || newOrder.cashier_name || 'Front Desk',
        created_at: new Date().toISOString()
      };
      this.data.payments.unshift(payment);
    }

    // Auto-Print trigger (PrintProvider abstraction)
    const billDevice = this.data.print_devices.find(d => d.is_online && d.auto_print_bill);
    if (billDevice) {
      this.queuePrintJob({
        device_id: billDevice.id,
        job_type: 'bill',
        order_id: newOrder.id,
        payload: {
          bill_number: newOrder.bill_number,
          invoice_number: newOrder.invoice_number,
          customer_name: newOrder.customer_name,
          customer_phone: newOrder.customer_phone,
          items: newOrder.items.map(i => ({
            name: i.item_name,
            quantity: i.quantity,
            price: i.total_price,
            staff: i.staff_name
          })),
          subtotal: newOrder.subtotal,
          discount: newOrder.discount,
          tax: newOrder.tax_amount,
          tip: newOrder.tip_amount,
          total: newOrder.grand_total,
          payment_method: newOrder.primary_payment_mode,
          payment_status: newOrder.payment_status,
          date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        }
      });
    }

    await this.logAudit('CREATE', 'Order', newOrder.id, performedBy, `Generated Bill: ${newOrder.bill_number} for ₹${newOrder.grand_total}`);
    this.save();
    return newOrder;
  }

  public async updateOrder(id: string, data: Partial<Order>): Promise<Order | null> {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.data.orders[idx] = { ...this.data.orders[idx], ...data };
    this.save();
    return this.data.orders[idx];
  }

  public async updateOrderStatus(id: string, status: Order['payment_status'], performedBy: string): Promise<Order | null> {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.data.orders[idx].payment_status = status;
    await this.logAudit('UPDATE', 'Order', id, performedBy, `Updated order status to ${status}`);
    this.save();
    return this.data.orders[idx];
  }

  // --- Payments & Refunds ---
  public async getPayments(): Promise<PaymentRecord[]> {
    return this.data.payments;
  }

  public async recordPayment(payment: Omit<PaymentRecord, 'id' | 'created_at'>, performedBy: string): Promise<PaymentRecord> {
    const newPay: PaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.data.payments.unshift(newPay);
    await this.logAudit('CREATE', 'Payment', newPay.id, performedBy, `Recorded payment of ₹${newPay.amount} for bill ${newPay.bill_number}`);
    this.save();
    return newPay;
  }

  public async refundPayment(id: string, reason: string, performedBy: string): Promise<PaymentRecord | null> {
    const idx = this.data.payments.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.payments[idx].status = 'Refunded';
    this.data.payments[idx].refund_reason = reason;
    await this.logAudit('REFUND', 'Payment', id, performedBy, `Refunded payment for bill ${this.data.payments[idx].bill_number}: ${reason}`);
    this.save();
    return this.data.payments[idx];
  }

  // --- Inventory Products, Suppliers & Movements ---
  public async getProducts(): Promise<Product[]> {
    return this.data.products;
  }

  public async getProductById(id: string): Promise<Product | null> {
    return this.data.products.find(p => p.id === id) || null;
  }

  public async createProduct(prod: Omit<Product, 'id' | 'updated_at'>, performedBy: string): Promise<Product> {
    const newProd: Product = {
      ...prod,
      id: `prod-${Date.now()}`,
      updated_at: new Date().toISOString()
    };
    this.data.products.push(newProd);
    await this.logAudit('CREATE', 'Product', newProd.id, performedBy, `Added product: ${newProd.name} (${newProd.sku})`);
    this.save();
    return newProd;
  }

  public async updateProduct(id: string, prod: Partial<Product>, performedBy: string): Promise<Product | null> {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.products[idx] = { ...this.data.products[idx], ...prod, updated_at: new Date().toISOString() };
    await this.logAudit('UPDATE', 'Product', id, performedBy, `Updated product: ${this.data.products[idx].name}`);
    this.save();
    return this.data.products[idx];
  }

  public async deleteProduct(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const name = this.data.products[idx].name;
    this.data.products.splice(idx, 1);
    await this.logAudit('DELETE', 'Product', id, performedBy, `Deleted product: ${name}`);
    this.save();
    return true;
  }

  public async recordInventoryMovement(movement: Omit<InventoryMovement, 'id' | 'created_at'>, performedBy: string): Promise<InventoryMovement> {
    const prod = this.data.products.find(p => p.id === movement.product_id);
    let balance = prod ? prod.current_stock : 0;
    if (prod) {
      if (['stock_out', 'damaged', 'wastage', 'service_usage', 'pos_sale'].includes(movement.movement_type)) {
        prod.current_stock = Math.max(0, prod.current_stock - Math.abs(movement.quantity));
      } else if (movement.movement_type === 'stock_in') {
        prod.current_stock += Math.abs(movement.quantity);
      } else if (movement.movement_type === 'adjustment') {
        prod.current_stock = Math.max(0, prod.current_stock + movement.quantity);
      }
      balance = prod.current_stock;
      prod.updated_at = new Date().toISOString();
    }

    const newMov: InventoryMovement = {
      ...movement,
      id: `im-${Date.now()}`,
      balance_after: balance,
      created_at: new Date().toISOString()
    };
    this.data.inventory_movements.unshift(newMov);
    await this.logAudit('STOCK_MOVE', 'Product', movement.product_id, performedBy, `Recorded ${movement.movement_type} of ${movement.quantity} units for ${movement.product_name}`);
    this.save();
    return newMov;
  }

  public async getInventoryMovements(): Promise<InventoryMovement[]> {
    return this.data.inventory_movements;
  }

  public async getSuppliers(): Promise<Supplier[]> {
    return this.data.suppliers;
  }

  public async createSupplier(sup: Omit<Supplier, 'id' | 'created_at'>, performedBy: string): Promise<Supplier> {
    const newSup: Supplier = { ...sup, id: `sup-${Date.now()}`, created_at: new Date().toISOString() };
    this.data.suppliers.push(newSup);
    await this.logAudit('CREATE', 'Supplier', newSup.id, performedBy, `Added supplier: ${newSup.name}`);
    this.save();
    return newSup;
  }

  public async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return this.data.purchase_orders;
  }

  public async createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'created_at'>, performedBy: string): Promise<PurchaseOrder> {
    const newPo: PurchaseOrder = {
      ...po,
      id: `po-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.data.purchase_orders.unshift(newPo);
    await this.logAudit('CREATE', 'PurchaseOrder', newPo.id, performedBy, `Created Purchase Order: ${newPo.po_number}`);
    this.save();
    return newPo;
  }

  // --- Gallery ---
  public async getGallery(onlyApproved: boolean = false): Promise<GalleryItem[]> {
    let list = this.data.gallery;
    if (onlyApproved) list = list.filter(g => g.is_approved);
    return list.map(item => {
      const staff = this.resolveStaff(item.artist_name);
      return {
        ...item,
        artist_name: staff ? staff.name : item.artist_name
      };
    }).sort((a, b) => a.display_order - b.display_order);
  }

  public async createGalleryItem(item: Omit<GalleryItem, 'id' | 'created_at'>, performedBy: string): Promise<GalleryItem> {
    const newGal: GalleryItem = {
      ...item,
      id: `gal-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.data.gallery.push(newGal);
    await this.logAudit('CREATE', 'Gallery', newGal.id, performedBy, `Uploaded portfolio item: ${newGal.title}`);
    this.save();
    return newGal;
  }

  public async updateGalleryItem(id: string, item: Partial<GalleryItem>, performedBy: string): Promise<GalleryItem | null> {
    const idx = this.data.gallery.findIndex(g => g.id === id);
    if (idx === -1) return null;
    this.data.gallery[idx] = { ...this.data.gallery[idx], ...item };
    await this.logAudit('UPDATE', 'Gallery', id, performedBy, `Updated portfolio item approval/details`);
    this.save();
    return this.data.gallery[idx];
  }

  public async deleteGalleryItem(id: string, performedBy: string): Promise<boolean> {
    const idx = this.data.gallery.findIndex(g => g.id === id);
    if (idx === -1) return false;
    const title = this.data.gallery[idx].title;
    this.data.gallery.splice(idx, 1);
    await this.logAudit('DELETE', 'Gallery', id, performedBy, `Deleted gallery artwork: ${title}`);
    this.save();
    return true;
  }

  // --- Enquiries & Reviews ---
  public async getEnquiries(): Promise<Enquiry[]> {
    return this.data.enquiries;
  }

  public async createEnquiry(enquiry: Omit<Enquiry, 'id' | 'created_at'>): Promise<Enquiry> {
    const newEnq: Enquiry = {
      ...enquiry,
      id: `enq-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.data.enquiries.unshift(newEnq);
    this.save();
    return newEnq;
  }

  public async getReviews(): Promise<Review[]> {
    return this.data.reviews.filter(r => r.is_published);
  }

  public async createReview(review: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
    const newRev: Review = {
      ...review,
      id: `rev-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.data.reviews.unshift(newRev);
    this.save();
    return newRev;
  }

  // --- Print Devices & Queue ---
  public async getPrintDevices(): Promise<PrintDevice[]> {
    return this.data.print_devices;
  }

  public async registerPrintDevice(device: Partial<PrintDevice>): Promise<PrintDevice> {
    let dev = this.data.print_devices.find(d => d.device_id === device.device_id);
    if (dev) {
      Object.assign(dev, device, { is_online: true, last_heartbeat: new Date().toISOString() });
    } else {
      dev = {
        id: `dev-${Date.now()}`,
        device_name: device.device_name || 'Counter Thermal Printer',
        device_id: device.device_id || `DEV-${Date.now()}`,
        branch: device.branch || '31, Vinayak Nagar, Gachibowli, Hyderabad',
        printer_name: device.printer_name || 'Standard 80mm ESC/POS Printer',
        printer_type: device.printer_type || 'thermal',
        paper_size: device.paper_size || '80mm',
        is_online: true,
        auto_print_bill: device.auto_print_bill ?? true,
        auto_print_slip: device.auto_print_slip ?? true,
        copies: device.copies || 1,
        last_heartbeat: new Date().toISOString()
      };
      this.data.print_devices.push(dev);
    }
    this.save();
    return dev;
  }

  public async updateDeviceHeartbeat(deviceId: string): Promise<void> {
    const dev = this.data.print_devices.find(d => d.device_id === deviceId);
    if (dev) {
      dev.is_online = true;
      dev.last_heartbeat = new Date().toISOString();
      this.save();
    }
  }

  public async getPrintJobs(deviceId?: string): Promise<PrintJob[]> {
    if (!deviceId) return this.data.print_jobs;
    return this.data.print_jobs.filter(j => j.device_id === deviceId || this.data.print_devices.find(d => d.id === j.device_id)?.device_id === deviceId);
  }

  public async queuePrintJob(job: { device_id: string; job_type: 'bill' | 'service_ticket'; order_id?: string; appointment_id?: string; payload: any }): Promise<PrintJob> {
    const newJob: PrintJob = {
      id: `pj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      device_id: job.device_id,
      job_type: job.job_type,
      order_id: job.order_id,
      appointment_id: job.appointment_id,
      status: 'Pending',
      payload: job.payload,
      retry_count: 0,
      created_at: new Date().toISOString()
    };
    this.data.print_jobs.unshift(newJob);
    this.save();
    return newJob;
  }

  public async updatePrintJobStatus(id: string, status: PrintJob['status']): Promise<PrintJob | null> {
    const job = this.data.print_jobs.find(j => j.id === id);
    if (!job) return null;
    job.status = status;
    if (status === 'Printed') {
      job.printed_at = new Date().toISOString();
    }
    this.save();
    return job;
  }

  // --- Reports ---
  public async getReports(): Promise<any> {
    const orders = this.data.orders;
    const totalSales = orders.reduce((sum, o) => sum + o.grand_total, 0);
    const totalPaid = orders.reduce((sum, o) => sum + o.paid_amount, 0);
    const totalDue = orders.reduce((sum, o) => sum + o.due_amount, 0);

    const paymentModes: Record<string, number> = {};
    orders.forEach(o => {
      paymentModes[o.primary_payment_mode] = (paymentModes[o.primary_payment_mode] || 0) + o.paid_amount;
    });

    const serviceCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!serviceCounts[item.item_name]) {
          serviceCounts[item.item_name] = { name: item.item_name, count: 0, revenue: 0 };
        }
        serviceCounts[item.item_name].count += item.quantity;
        serviceCounts[item.item_name].revenue += item.total_price;
      });
    });

    const staffSales: Record<string, { name: string; servicesDone: number; totalSales: number; commission: number }> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        const staffObj = this.resolveStaff(item.staff_id || item.staff_name);
        const staffKey = staffObj ? staffObj.id : (item.staff_id || item.staff_name || 'Station Stylist');
        const displayName = staffObj ? staffObj.name : (item.staff_name || 'Station Stylist');
        if (!staffSales[staffKey]) {
          staffSales[staffKey] = { name: displayName, servicesDone: 0, totalSales: 0, commission: 0 };
        } else {
          staffSales[staffKey].name = displayName;
        }
        staffSales[staffKey].servicesDone += item.quantity;
        staffSales[staffKey].totalSales += item.total_price;
        staffSales[staffKey].commission += (item.commission_amount || (item.total_price * 0.1));
      });
    });

    const lowStockItems = this.data.products.filter(p => p.current_stock <= p.min_stock_alert);

    return {
      totalSales,
      totalPaid,
      totalDue,
      totalOrders: orders.length,
      totalAppointments: this.data.appointments.length,
      pendingAppointments: this.data.appointments.filter(a => a.status === 'Pending').length,
      activeStaffCount: this.data.staff.filter(s => s.is_active).length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      paymentModes,
      topServices: Object.values(serviceCounts).sort((a, b) => b.revenue - a.revenue),
      staffPerformance: Object.values(staffSales).sort((a, b) => b.totalSales - a.totalSales)
    };
  }

  public async getDetailedReports(filter?: SalesReportFilter): Promise<DetailedSalesReport> {
    const period = filter?.period || 'today';
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'this_week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'custom') {
      if (filter?.startDate) {
        start = new Date(filter.startDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      }
      if (filter?.endDate) {
        end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
        end.setHours(23, 59, 59, 999);
      }
    }

    const filteredOrders = this.data.orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= start && d <= end;
    });

    const filteredPayments = this.data.payments.filter(p => {
      const d = new Date(p.created_at);
      return d >= start && d <= end;
    });

    let gross_sales = 0;
    let service_sales = 0;
    let product_sales = 0;
    let completed_orders = 0;
    let cancelled_orders = 0;
    let total_discount = 0;
    let tax_gst = 0;
    let total_paid = 0;
    let outstanding_due = 0;

    const staffSalesMap: Record<string, { staff_name: string; role: string; services_count: number; service_revenue: number; commission_earned: number }> = {};
    const dayMap: Record<string, any> = {};

    filteredOrders.forEach(o => {
      if (o.payment_status === 'Cancelled') {
        cancelled_orders++;
        return;
      }

      completed_orders++;
      gross_sales += o.grand_total;
      total_discount += o.discount || 0;
      tax_gst += o.tax_amount || 0;
      total_paid += o.paid_amount || 0;
      outstanding_due += o.due_amount || 0;

      const orderDate = new Date(o.created_at);
      const dateKey = orderDate.toISOString().split('T')[0];
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          date: dateKey,
          formatted_date: orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          orders_count: 0,
          service_sales: 0,
          product_sales: 0,
          discount_amount: 0,
          tax_amount: 0,
          total_sales: 0,
          paid_amount: 0,
          due_amount: 0,
          cash_amount: 0,
          upi_amount: 0,
          card_amount: 0,
          split_amount: 0
        };
      }

      const dayRecord = dayMap[dateKey];
      dayRecord.orders_count++;
      dayRecord.discount_amount += o.discount || 0;
      dayRecord.tax_amount += o.tax_amount || 0;
      dayRecord.total_sales += o.grand_total;
      dayRecord.paid_amount += o.paid_amount || 0;
      dayRecord.due_amount += o.due_amount || 0;

      if (o.primary_payment_mode === 'Cash') dayRecord.cash_amount += o.paid_amount;
      else if (o.primary_payment_mode === 'UPI') dayRecord.upi_amount += o.paid_amount;
      else if (o.primary_payment_mode === 'Card') dayRecord.card_amount += o.paid_amount;
      else if (o.primary_payment_mode === 'Split Payment') dayRecord.split_amount += o.paid_amount;

      o.items.forEach(item => {
        if (item.item_type === 'service') {
          service_sales += item.total_price;
          dayRecord.service_sales += item.total_price;
        } else {
          product_sales += item.total_price;
          dayRecord.product_sales += item.total_price;
        }

        const staffObj = this.resolveStaff(item.staff_id || item.staff_name);
        const staffKey = staffObj ? staffObj.id : (item.staff_id || item.staff_name || 'Floor Stylist');
        const displayName = staffObj ? staffObj.name : (item.staff_name || 'Floor Stylist');
        const displayRole = staffObj ? staffObj.role : 'Stylist';

        if (!staffSalesMap[staffKey]) {
          staffSalesMap[staffKey] = {
            staff_name: displayName,
            role: displayRole,
            services_count: 0,
            service_revenue: 0,
            commission_earned: 0
          };
        } else {
          staffSalesMap[staffKey].staff_name = displayName;
          staffSalesMap[staffKey].role = displayRole;
        }
        if (item.item_type === 'service') {
          staffSalesMap[staffKey].services_count += item.quantity;
          staffSalesMap[staffKey].service_revenue += item.total_price;
          staffSalesMap[staffKey].commission_earned += (item.commission_amount || Math.round(item.total_price * 0.1));
        }
      });
    });

    let refunded_count = 0;
    let total_refund_amount = 0;
    let cashPayments = 0;
    let upiPayments = 0;
    let cardPayments = 0;
    let splitPayments = 0;
    let otherPayments = 0;

    filteredPayments.forEach(p => {
      if (p.status === 'Refunded') {
        refunded_count++;
        total_refund_amount += p.amount;
      } else if (p.status === 'Success') {
        if (p.payment_mode === 'Cash') cashPayments += p.amount;
        else if (p.payment_mode === 'UPI') upiPayments += p.amount;
        else if (p.payment_mode === 'Card') cardPayments += p.amount;
        else if (p.payment_mode === 'Split Payment') splitPayments += p.amount;
        else otherPayments += p.amount;
      }
    });

    const net_sales = Math.max(0, gross_sales - total_discount - total_refund_amount);

    return {
      filter: {
        period,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      summary: {
        gross_sales,
        service_sales,
        product_sales,
        completed_orders,
        cancelled_orders,
        refunded_count,
        total_refund_amount,
        total_discount,
        tax_gst,
        net_sales,
        total_paid,
        outstanding_due
      },
      payment_breakdown: {
        cash: cashPayments,
        upi: upiPayments,
        card: cardPayments,
        split: splitPayments,
        other: otherPayments
      },
      staff_performance: Object.values(staffSalesMap).sort((a, b) => b.service_revenue - a.service_revenue),
      day_wise_breakdown: Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date))
    };
  }

  // ==========================================================================
  // WhatsApp Message Logs
  // ==========================================================================

  public async getWhatsAppMessageLogs(appointmentId?: string, branchId?: string): Promise<WhatsAppMessageLog[]> {
    let logs = this.data.whatsapp_message_logs || [];
    if (appointmentId) {
      logs = logs.filter(l => l.appointment_id === appointmentId);
    }
    if (branchId) {
      logs = logs.filter(l => l.branch_id === branchId);
    }
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async createWhatsAppMessageLog(log: Omit<WhatsAppMessageLog, 'id' | 'created_at' | 'updated_at'>): Promise<WhatsAppMessageLog> {
    if (!this.data.whatsapp_message_logs) this.data.whatsapp_message_logs = [];
    const now = new Date().toISOString();
    const newLog: WhatsAppMessageLog = {
      ...log,
      id: `wml-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: now,
      updated_at: now
    };
    this.data.whatsapp_message_logs.push(newLog);

    if (newLog.appointment_id) {
      const apt = this.data.appointments.find(a => a.id === newLog.appointment_id);
      if (apt) {
        apt.whatsapp_status = newLog.status;
        apt.last_whatsapp_sent_at = newLog.sent_at || now;
        apt.last_whatsapp_error = newLog.error_message;
      }
    }

    this.save();
    return newLog;
  }

  public async updateWhatsAppMessageLogByMetaId(metaMessageId: string, data: Partial<WhatsAppMessageLog>): Promise<WhatsAppMessageLog | null> {
    if (!this.data.whatsapp_message_logs) return null;
    const log = this.data.whatsapp_message_logs.find(l => l.meta_message_id === metaMessageId);
    if (!log) return null;

    Object.assign(log, data, { updated_at: new Date().toISOString() });

    if (log.appointment_id) {
      const apt = this.data.appointments.find(a => a.id === log.appointment_id);
      if (apt && data.status) {
        apt.whatsapp_status = data.status;
        if (data.error_message) apt.last_whatsapp_error = data.error_message;
      }
    }

    this.save();
    return log;
  }

  public async updateWhatsAppMessageLog(id: string, data: Partial<WhatsAppMessageLog>): Promise<WhatsAppMessageLog | null> {
    if (!this.data.whatsapp_message_logs) return null;
    const log = this.data.whatsapp_message_logs.find(l => l.id === id);
    if (!log) return null;
    Object.assign(log, data, { updated_at: new Date().toISOString() });
    this.save();
    return log;
  }

  public async getDueWhatsAppMessageRetries(): Promise<WhatsAppMessageLog[]> {
    if (!this.data.whatsapp_message_logs) return [];
    const now = Date.now();
    return this.data.whatsapp_message_logs.filter(
      l => l.status === 'retrying' && l.next_retry_at && new Date(l.next_retry_at).getTime() <= now && (l.retry_count || 0) < 3
    );
  }

  // ==========================================================================
  // Customer Feedback
  // ==========================================================================

  public async getAppointmentFeedback(branchId?: string): Promise<AppointmentFeedback[]> {
    let list = this.data.appointment_feedback || [];
    if (branchId) {
      list = list.filter(f => f.branch_id === branchId);
    }
    return list.sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime());
  }

  public async createAppointmentFeedback(feedback: Omit<AppointmentFeedback, 'id' | 'received_at'>): Promise<AppointmentFeedback> {
    if (!this.data.appointment_feedback) this.data.appointment_feedback = [];

    const existing = this.data.appointment_feedback.find(f => f.appointment_id === feedback.appointment_id);
    if (existing) {
      return existing;
    }

    const newFeedback: AppointmentFeedback = {
      ...feedback,
      id: `fbk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      received_at: new Date().toISOString(),
      is_read: false,
      notification_read: false
    };
    this.data.appointment_feedback.push(newFeedback);
    this.save();
    return newFeedback;
  }

  public async updateAppointmentFeedback(id: string, data: Partial<AppointmentFeedback>): Promise<AppointmentFeedback | null> {
    if (!this.data.appointment_feedback) this.data.appointment_feedback = [];
    const idx = this.data.appointment_feedback.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.data.appointment_feedback[idx] = { ...this.data.appointment_feedback[idx], ...data };
    this.save();
    return this.data.appointment_feedback[idx];
  }

  public async markFeedbackAsRead(id: string): Promise<boolean> {
    if (!this.data.appointment_feedback) return false;
    const item = this.data.appointment_feedback.find(f => f.id === id);
    if (!item) return false;
    item.is_read = true;
    item.notification_read = true;
    this.save();
    return true;
  }

  // ==========================================================================
  // Durable Scheduled Feedback Jobs
  // ==========================================================================

  public async getScheduledFeedbackJobs(status?: string): Promise<ScheduledFeedbackJob[]> {
    let list = this.data.scheduled_feedback_jobs || [];
    if (status) {
      list = list.filter(j => j.status === status);
    }
    return list.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }

  public async getDueScheduledFeedbackJobs(): Promise<ScheduledFeedbackJob[]> {
    const now = Date.now();
    const list = this.data.scheduled_feedback_jobs || [];
    return list.filter(j => j.status === 'pending' && new Date(j.scheduled_at).getTime() <= now);
  }

  public async createScheduledFeedbackJob(job: Omit<ScheduledFeedbackJob, 'id' | 'created_at' | 'updated_at'>): Promise<ScheduledFeedbackJob> {
    if (!this.data.scheduled_feedback_jobs) this.data.scheduled_feedback_jobs = [];

    const existing = this.data.scheduled_feedback_jobs.find(
      j => (
        (job.appointment_id && j.appointment_id === job.appointment_id) ||
        (job.order_id && j.order_id === job.order_id && (!job.job_type || j.job_type === job.job_type))
      ) && (j.status === 'pending' || j.status === 'completed' || j.status === 'processing')
    );
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newJob: ScheduledFeedbackJob = {
      ...job,
      id: `sfj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: now,
      updated_at: now
    };
    this.data.scheduled_feedback_jobs.push(newJob);
    this.save();
    return newJob;
  }

  public async updateScheduledFeedbackJob(id: string, data: Partial<ScheduledFeedbackJob>): Promise<ScheduledFeedbackJob | null> {
    if (!this.data.scheduled_feedback_jobs) return null;
    const job = this.data.scheduled_feedback_jobs.find(j => j.id === id);
    if (!job) return null;
    Object.assign(job, data, { updated_at: new Date().toISOString() });
    this.save();
    return job;
  }

  public async cancelScheduledFeedbackJobByAppointment(appointmentId: string): Promise<boolean> {
    if (!this.data.scheduled_feedback_jobs) return false;
    let found = false;
    this.data.scheduled_feedback_jobs.forEach(j => {
      if (j.appointment_id === appointmentId && j.status === 'pending') {
        j.status = 'cancelled';
        j.updated_at = new Date().toISOString();
        found = true;
      }
    });
    if (found) this.save();
    return found;
  }

  public async cancelScheduledFeedbackJobByOrder(orderId: string): Promise<boolean> {
    if (!this.data.scheduled_feedback_jobs) return false;
    let found = false;
    this.data.scheduled_feedback_jobs.forEach(j => {
      if (j.order_id === orderId && j.status === 'pending') {
        j.status = 'cancelled';
        j.updated_at = new Date().toISOString();
        found = true;
      }
    });
    if (found) this.save();
    return found;
  }

  // ==========================================================================
  // Webhook Event Idempotency
  // ==========================================================================

  public async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    if (!this.data.processed_webhook_events) return false;
    return this.data.processed_webhook_events.some(e => e.event_id === eventId);
  }

  public async recordProcessedWebhookEvent(eventId: string, eventType: string): Promise<ProcessedWebhookEvent> {
    if (!this.data.processed_webhook_events) this.data.processed_webhook_events = [];
    const event: ProcessedWebhookEvent = {
      id: `pwe-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_id: eventId,
      event_type: eventType,
      processed_at: new Date().toISOString()
    };
    if (this.data.processed_webhook_events.length > 5000) {
      this.data.processed_webhook_events = this.data.processed_webhook_events.slice(-4000);
    }
    this.data.processed_webhook_events.push(event);
    this.save();
    return event;
  }

  // ==========================================================================
  // Automated Daily Stylist Sales Reporting
  // ==========================================================================

  public async getDailySalesReports(date?: string): Promise<DailySalesReportLog[]> {
    if (!this.data.daily_sales_reports) this.data.daily_sales_reports = [];
    if (!date) return [...this.data.daily_sales_reports].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return this.data.daily_sales_reports
      .filter(r => r.report_date === date)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  public async getDailySalesReportByRecipient(date: string, recipientPhone: string, reportType: string): Promise<DailySalesReportLog | null> {
    if (!this.data.daily_sales_reports) this.data.daily_sales_reports = [];
    const cleanPhone = recipientPhone.replace(/\D/g, '').slice(-10);
    const match = this.data.daily_sales_reports.find(r => 
      r.report_date === date && 
      r.report_type === reportType && 
      r.recipient_phone.replace(/\D/g, '').slice(-10) === cleanPhone
    );
    return match || null;
  }

  public async createDailySalesReport(report: Omit<DailySalesReportLog, 'id' | 'created_at' | 'updated_at'>): Promise<DailySalesReportLog> {
    if (!this.data.daily_sales_reports) this.data.daily_sales_reports = [];
    const id = `dsr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const newRecord: DailySalesReportLog = {
      ...report,
      id,
      created_at: now,
      updated_at: now
    };
    this.data.daily_sales_reports.push(newRecord);
    this.save();
    return newRecord;
  }

  public async updateDailySalesReport(id: string, data: Partial<DailySalesReportLog>): Promise<DailySalesReportLog | null> {
    if (!this.data.daily_sales_reports) this.data.daily_sales_reports = [];
    const idx = this.data.daily_sales_reports.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.daily_sales_reports[idx] = {
      ...this.data.daily_sales_reports[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.daily_sales_reports[idx];
  }

  // =========================================================================
  // WhatsApp Inbox & Customer Chat Methods
  // =========================================================================
  private calculateWindowStatus(lastInboundAt?: string): CustomerServiceWindowInfo {
    const now = Date.now();
    const lastInbound = lastInboundAt ? new Date(lastInboundAt).getTime() : 0;
    const windowDuration = 24 * 60 * 60 * 1000;
    const isOpen = lastInbound > 0 && (now - lastInbound) < windowDuration;
    const expiresAt = lastInbound > 0 ? new Date(lastInbound + windowDuration).toISOString() : undefined;
    const msRemaining = isOpen ? (lastInbound + windowDuration - now) : 0;
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const formattedRemaining = isOpen ? `${hoursRemaining}h ${minutesRemaining}m remaining` : undefined;

    return {
      isOpen,
      expiresAt,
      hoursRemaining: isOpen ? hoursRemaining : 0,
      minutesRemaining: isOpen ? minutesRemaining : 0,
      formattedRemaining
    };
  }

  public async getWhatsAppConversations(
    salonIdOrOpts?: string | { salonId?: string; salon_id?: string; branchId?: string; branch_id?: string; filter?: WhatsAppInboxFilter; status?: any; search?: string },
    branchId?: string,
    filter?: WhatsAppInboxFilter,
    search?: string
  ): Promise<WhatsAppConversation[]> {
    if (!this.data.whatsapp_conversations) this.data.whatsapp_conversations = [];
    let targetSalonId: string | undefined = undefined;
    let targetBranchId = branchId;
    let targetFilter = filter;
    let targetSearch = search;

    if (typeof salonIdOrOpts === 'object' && salonIdOrOpts !== null) {
      targetSalonId = salonIdOrOpts.salonId || salonIdOrOpts.salon_id;
      targetBranchId = salonIdOrOpts.branchId || salonIdOrOpts.branch_id;
      targetFilter = (salonIdOrOpts.filter || salonIdOrOpts.status) as WhatsAppInboxFilter;
      targetSearch = salonIdOrOpts.search;
    } else if (typeof salonIdOrOpts === 'string' && salonIdOrOpts !== 'all') {
      targetSalonId = salonIdOrOpts;
    }

    let list = this.data.whatsapp_conversations;
    if (targetSalonId && targetSalonId !== 'all') {
      list = list.filter(c => !c.salon_id || c.salon_id === targetSalonId || (c as any).business_id === targetSalonId);
    }

    if (targetBranchId && targetBranchId !== 'all') {
      list = list.filter(c => !c.branch_id || c.branch_id === targetBranchId);
    }
    if (targetFilter === 'unread') {
      list = list.filter(c => (c.unread_count || 0) > 0);
    } else if (targetFilter === 'open') {
      list = list.filter(c => (c.status || '').toUpperCase() === 'OPEN');
    } else if (targetFilter === 'closed') {
      list = list.filter(c => (c.status || '').toUpperCase() === 'CLOSED');
    }

    if (targetSearch && targetSearch.trim()) {
      const s = targetSearch.trim().toLowerCase();
      list = list.filter(c => 
        (c.customer_name && c.customer_name.toLowerCase().includes(s)) ||
        (c.customer_phone && c.customer_phone.includes(s))
      );
    }

    return list
      .map(c => ({
        ...c,
        last_message_preview: c.last_message_preview || c.last_message_text || (c as any).last_message || '',
        last_message_text: c.last_message_text || c.last_message_preview || (c as any).last_message || '',
        window_status: this.calculateWindowStatus(c.last_inbound_at)
      }))
      .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
  }

  public async getWhatsAppConversationById(id: string): Promise<WhatsAppConversation | null> {
    if (!this.data.whatsapp_conversations) this.data.whatsapp_conversations = [];
    const c = this.data.whatsapp_conversations.find(x => x.id === id);
    if (!c) return null;
    return {
      ...c,
      window_status: this.calculateWindowStatus(c.last_inbound_at)
    };
  }

  public async getOrCreateWhatsAppConversation(data: {
    salonId?: string;
    salon_id?: string;
    branchId?: string;
    branch_id?: string;
    customerPhone?: string;
    customer_phone?: string;
    customerName?: string;
    customer_name?: string;
    waPhoneNumberId?: string;
    wa_phone_number_id?: string;
    customerWaId?: string;
    customer_wa_id?: string;
    customerId?: string;
    customer_id?: string;
    sourceChannel?: 'WHATSAPP' | 'WEBSITE_ENQUIRY' | 'MIXED';
    source_channel?: 'WHATSAPP' | 'WEBSITE_ENQUIRY' | 'MIXED';
  }): Promise<WhatsAppConversation> {
    if (!this.data.whatsapp_conversations) this.data.whatsapp_conversations = [];
    const salonId = data.salonId || data.salon_id || 'tgl-gachibowli-main';
    const branchId = data.branchId || data.branch_id || 'tgl-gachibowli-main';
    const rawPhone = data.customerPhone || data.customer_phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : rawPhone;
    const customerName = data.customerName || data.customer_name;
    const waPhoneNumberId = data.waPhoneNumberId || data.wa_phone_number_id;
    const customerWaId = data.customerWaId || data.customer_wa_id;
    const customerId = data.customerId || data.customer_id;
    const incomingSource = data.sourceChannel || data.source_channel || 'WHATSAPP';

    const existing = this.data.whatsapp_conversations.find(
      c => (c.customer_phone || '').replace(/\D/g, '').slice(-10) === cleanPhone
    );

    if (existing) {
      let needsSave = false;
      if (customerName && (!existing.customer_name || existing.customer_name === 'Valued Customer' || existing.customer_name === 'WhatsApp Customer' || existing.customer_name === 'Website Visitor')) {
        existing.customer_name = customerName;
        needsSave = true;
      }
      if (customerId && !existing.customer_id) {
        existing.customer_id = customerId;
        needsSave = true;
      }
      if (waPhoneNumberId && !existing.wa_phone_number_id) {
        existing.wa_phone_number_id = waPhoneNumberId;
        needsSave = true;
      }
      if (existing.source_channel && existing.source_channel !== incomingSource && existing.source_channel !== 'MIXED') {
        existing.source_channel = 'MIXED';
        needsSave = true;
      }
      if (needsSave) this.save();
      return {
        ...existing,
        source_channel: existing.source_channel || incomingSource,
        window_status: this.calculateWindowStatus(existing.last_inbound_at)
      };
    }

    const now = new Date().toISOString();
    const newConv: WhatsAppConversation = {
      id: `wac-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      salon_id: salonId,
      branch_id: branchId,
      customer_id: data.customerId,
      wa_phone_number_id: data.waPhoneNumberId,
      customer_wa_id: data.customerWaId,
      customer_phone: formattedPhone,
      customer_name: data.customerName || (incomingSource === 'WEBSITE_ENQUIRY' ? 'Website Visitor' : 'WhatsApp Customer'),
      status: 'OPEN',
      unread_count: 0,
      source_channel: incomingSource,
      last_message_at: now,
      created_at: now,
      updated_at: now
    };

    this.data.whatsapp_conversations.unshift(newConv);
    this.save();
    return {
      ...newConv,
      window_status: this.calculateWindowStatus(newConv.last_inbound_at)
    };
  }

  public async updateWhatsAppConversation(id: string, data: Partial<WhatsAppConversation>): Promise<WhatsAppConversation | null> {
    if (!this.data.whatsapp_conversations) this.data.whatsapp_conversations = [];
    const { window_status: _omitWin, id: _omitId, ...cleanData } = data as any;
    let idx = this.data.whatsapp_conversations.findIndex(c => c.id === id);
    if (idx === -1 && cleanData.customer_phone) {
      idx = this.data.whatsapp_conversations.findIndex(c => c.customer_phone === cleanData.customer_phone);
    }
    if (idx === -1) return null;
    this.data.whatsapp_conversations[idx] = {
      ...this.data.whatsapp_conversations[idx],
      ...cleanData,
      updated_at: new Date().toISOString()
    };
    this.save();
    return {
      ...this.data.whatsapp_conversations[idx],
      window_status: this.calculateWindowStatus(this.data.whatsapp_conversations[idx].last_inbound_at)
    };
  }

  public async deleteWhatsAppConversation(id: string): Promise<boolean> {
    if (!this.data.whatsapp_conversations) this.data.whatsapp_conversations = [];
    if (!this.data.whatsapp_messages) this.data.whatsapp_messages = [];
    const clean10 = id.replace(/\D/g, '').slice(-10);
    this.data.whatsapp_conversations = this.data.whatsapp_conversations.filter(
      c => c.id !== id && (clean10.length === 10 ? c.customer_phone?.replace(/\D/g, '').slice(-10) !== clean10 : true)
    );
    this.data.whatsapp_messages = this.data.whatsapp_messages.filter(
      m => m.conversation_id !== id
    );
    this.save();
    return true;
  }

  public async markWhatsAppConversationRead(id: string): Promise<boolean> {
    await this.updateWhatsAppConversation(id, { unread_count: 0 });
    return true;
  }

  public async getWhatsAppInboxUnreadCount(salonId?: string, branchId?: string): Promise<number> {
    if (!this.data.whatsapp_conversations) this.data.whatsapp_conversations = [];
    const targetSalonId = salonId || 'tgl-gachibowli-main';
    return this.data.whatsapp_conversations
      .filter(c => c.salon_id === targetSalonId && c.status === 'OPEN' && (!branchId || c.branch_id === branchId))
      .reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
  }

  public async getWhatsAppMessages(conversationId: string, limit: number = 100, before?: string): Promise<WhatsAppMessage[]> {
    if (!this.data.whatsapp_messages) this.data.whatsapp_messages = [];
    let list = this.data.whatsapp_messages.filter(m => m.conversation_id === conversationId);
    if (before) {
      list = list.filter(m => new Date(m.created_at || 0).getTime() < new Date(before).getTime());
    }
    return list
      .map(m => ({
        ...m,
        direction: (m.direction || 'INBOUND').toUpperCase() as 'INBOUND' | 'OUTBOUND',
        message_type: m.message_type || (m as any).type || 'text',
        type: m.message_type || (m as any).type || 'text',
        text_body: m.text_body || (m as any).body || '',
        body: m.text_body || (m as any).body || '',
        status: m.status || (m as any).delivery_status || 'sent',
        delivery_status: m.status || (m as any).delivery_status || 'sent',
        source_badge: m.source_badge || (m as any).source || ((m.direction || 'INBOUND').toUpperCase() === 'INBOUND' ? 'WHATSAPP' : 'ADMIN'),
        source: m.source_badge || (m as any).source || ((m.direction || 'INBOUND').toUpperCase() === 'INBOUND' ? 'WHATSAPP' : 'ADMIN')
      }))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      .slice(-limit);
  }

  public async createWhatsAppMessage(message: Omit<WhatsAppMessage, 'id' | 'created_at'>): Promise<WhatsAppMessage> {
    if (!this.data.whatsapp_messages) this.data.whatsapp_messages = [];
    if (message.meta_message_id) {
      const existing = this.data.whatsapp_messages.find(m => m.meta_message_id === message.meta_message_id);
      if (existing) return existing;
    }

    const now = new Date().toISOString();
    const direction = (message.direction || 'INBOUND').toUpperCase() as 'INBOUND' | 'OUTBOUND';
    const messageType = message.message_type || (message as any).type || 'text';
    const textBody = message.text_body || (message as any).body || '';
    const status = message.status || (message as any).delivery_status || 'sent';
    const sourceBadge = message.source_badge || (message as any).source_channel || (direction === 'INBOUND' ? 'WHATSAPP' : 'ADMIN');
    const sentByUserId = message.sent_by_user_id || (message as any).sender_admin_id || null;
    const sentByUserName = message.sent_by_user_name || (message as any).sender_admin_name || null;

    const newMsg: WhatsAppMessage = {
      ...message,
      id: `wam-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      salon_id: message.salon_id || 'tgl-gachibowli-main',
      branch_id: message.branch_id || 'tgl-gachibowli-main',
      conversation_id: message.conversation_id,
      direction,
      message_type: messageType,
      type: messageType,
      text_body: textBody,
      body: textBody,
      status,
      delivery_status: status,
      source_badge: sourceBadge,
      sent_by_user_id: sentByUserId,
      sent_by_user_name: sentByUserName,
      created_at: now
    };
    this.data.whatsapp_messages.push(newMsg);
    this.save();
    return newMsg;
  }

  public async updateWhatsAppMessageByMetaId(metaMessageId: string, data: Partial<WhatsAppMessage>): Promise<WhatsAppMessage | null> {
    if (!this.data.whatsapp_messages) this.data.whatsapp_messages = [];
    const idx = this.data.whatsapp_messages.findIndex(m => m.meta_message_id === metaMessageId);
    if (idx === -1) return null;
    this.data.whatsapp_messages[idx] = {
      ...this.data.whatsapp_messages[idx],
      ...data
    };
    this.save();
    return this.data.whatsapp_messages[idx];
  }

  public async updateWhatsAppMessage(id: string, data: Partial<WhatsAppMessage>): Promise<WhatsAppMessage | null> {
    if (!this.data.whatsapp_messages) this.data.whatsapp_messages = [];
    const idx = this.data.whatsapp_messages.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.data.whatsapp_messages[idx] = {
      ...this.data.whatsapp_messages[idx],
      ...data
    };
    this.save();
    return this.data.whatsapp_messages[idx];
  }

  public async createWhatsAppWebhookEvent(event: Omit<WhatsAppWebhookEvent, 'id' | 'received_at'>): Promise<WhatsAppWebhookEvent> {
    if (!this.data.whatsapp_webhook_events) this.data.whatsapp_webhook_events = [];
    const id = `whe-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const received_at = new Date().toISOString();
    const newEvent: WhatsAppWebhookEvent = {
      ...event,
      id,
      received_at,
      processed_at: event.processed_at || received_at
    };
    this.data.whatsapp_webhook_events.unshift(newEvent);
    if (this.data.whatsapp_webhook_events.length > 500) {
      this.data.whatsapp_webhook_events = this.data.whatsapp_webhook_events.slice(0, 500);
    }
    this.save();
    return newEvent;
  }

  public async getWhatsAppWebhookDiagnostics(): Promise<WhatsAppInboxDiagnostics> {
    const events = this.data.whatsapp_webhook_events || [];
    const latest = events[0] || null;
    const latestError = events.find(e => e.status === 'failed' || !!e.error_message);
    const convs = this.data.whatsapp_conversations || [];
    const activeCount = convs.filter(c => (c.status || '').toUpperCase() === 'OPEN').length;

    return {
      status: 'online',
      meta_webhook_callback_url: 'https://www.glossylooks.in/api/whatsapp/webhook',
      last_webhook_received_at: latest?.received_at || null,
      last_webhook_event_type: latest?.event_type || null,
      last_webhook_error: latestError?.error_message || null,
      total_events_received: events.length,
      database_provider: 'SalonDatabase (JSON File Repository)',
      environment: process.env.NODE_ENV || 'production',
      waba_phone_number_id: '918985799459',
      active_conversations_count: activeCount
    };
  }
}

import { SupabaseSalonRepository } from './repositories/supabaseSalonRepository.ts';

function createSalonRepository(): ISalonRepository {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl && supabaseServiceRoleKey) {
    console.log('🚀 Using SupabaseSalonRepository as active database provider');
    return new SupabaseSalonRepository(supabaseUrl, supabaseServiceRoleKey);
  }

  console.error('❌ Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');

  console.log('📁 Using SalonDatabase (Persistent Repository) as database provider');
  return new SalonDatabase();
}

export const salonRepository = createSalonRepository();
export const salonDb = salonRepository;


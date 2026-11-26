import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../db";
import { Service } from "../models/Service";
import { env } from "../env";

const services = [
  {
    serviceName: "Signature Haircut & Blowout",
    category: "Haircut & Styling",
    description: "A tailored cut, wash and polished blowout designed to frame your face beautifully.",
    price: 65,
    duration: 75,
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
  {
    serviceName: "Balayage Highlights",
    category: "Hair Coloring",
    description: "Soft, hand-painted highlights for a natural sun-kissed finish with a glossy tone.",
    price: 150,
    duration: 150,
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
  {
    serviceName: "Keratin Smoothing Treatment",
    category: "Hair Treatment",
    description: "Frizz control and deep repair that leaves hair smooth, shiny and easy to manage.",
    price: 120,
    duration: 120,
    image: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
  {
    serviceName: "Glow Facial",
    category: "Facial & Skincare",
    description: "A rejuvenating facial with gentle exfoliation, hydration and a calming mask.",
    price: 90,
    duration: 60,
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
  {
    serviceName: "Occasion Makeup",
    category: "Makeup",
    description: "Flawless, long-lasting makeup for weddings, events and special celebrations.",
    price: 110,
    duration: 75,
    image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
  {
    serviceName: "Luxury Manicure & Pedicure",
    category: "Manicure & Pedicure",
    description: "Shaping, cuticle care, massage and a flawless polish for hands and feet.",
    price: 75,
    duration: 90,
    image: "https://images.unsplash.com/photo-1600999684364-6cb052d7c68e?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
  {
    serviceName: "Aromatherapy Massage",
    category: "Spa & Massage",
    description: "A restorative full-body massage with warm oils to release tension and restore calm.",
    price: 130,
    duration: 90,
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
  {
    serviceName: "Scalp Renewal Ritual",
    category: "Hair Treatment",
    description: "A clarifying scalp treatment with massage and nourishing botanicals for healthy roots.",
    price: 85,
    duration: 60,
    image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=1200&q=80",
    status: "active",
  },
];

async function seed() {
  await connectDB();
  await Service.deleteMany({});
  await Service.insertMany(services);
  console.log(`Seeded ${services.length} SalonBook services into ${env.MONGODB_URI}`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

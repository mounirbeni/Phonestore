import { sql } from "drizzle-orm";
import { orders } from "@/db/schema";

/** Today in Morocco, as a SQL condition on `orders.created_at` (stored in UTC). */
export const todayInShop = () => sql`(${orders.createdAt} at time zone 'UTC' at time zone 'Africa/Casablanca')::date = (now() at time zone 'Africa/Casablanca')::date`;

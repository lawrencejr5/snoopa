import { internalMutation } from "./_generated/server";

export const migrateWatchlist = internalMutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("watchlist").collect();
    let count = 0;

    for (const item of items) {
      const dbItem: any = item;
      const updates: any = {};
      
      if (dbItem.serper_type !== undefined) {
        updates.search_type = dbItem.serper_type === "news" ? "news" : "general";
        updates.serper_type = undefined; // Deletes the field
      }
      
      if (dbItem.serper_date_range !== undefined) {
        updates.time_range = dbItem.serper_date_range;
        updates.serper_date_range = undefined; // Deletes the field
      }
      
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(item._id, updates);
        count++;
      }
    }
    
    return `Migrated ${count} watchlist items.`;
  },
});

// lib/localDb.ts
import Dexie, { Table } from 'dexie';

export class ZedPossLocalDB extends Dexie {
  // Jo tables offline chahiye unko yahan define karenge
  menuItems!: Table<any, string>; 
  orders!: Table<any, string>;
  orderItems!: Table<any, string>;
  customers!: Table<any, string>;
  
  // Ye sabse important table hai: The Sync Queue
  syncQueue!: Table<any, number>;

  constructor() {
    super('ZedPossLocalDB');
    
    // Indexes define kar rahe hain jiske basis par fast search hogi
    this.version(1).stores({
      menuItems: 'id, tenantId, category, isActive',
      orders: 'id, billNumber, outletId, syncStatus', // syncStatus: 'pending' | 'synced'
      orderItems: 'id, orderId',
      customers: 'id, phone, tenantId',
      syncQueue: '++id, entity, action, status' // entity: 'order', action: 'create'
    });
  }
}

export const localDB = new ZedPossLocalDB();

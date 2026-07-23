import { openDB, IDBPDatabase } from 'idb'

const DB_NAME = 'SpaceWeatherDB'
const DB_VERSION = 1

const STORES = [
  'ace_swepam', 'ace_mag', 'ace_epam', 'ace_sis', 'ace_swics',
  'goes_xray', 'goes_proton', 'goes_electron', 'goes_mag', 'goes_wind',
  'cosmic_neutron'
]

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'time_tag' })
        }
      })
    }
  })
}

export async function saveData(storeName: string, records: any[]): Promise<void> {
  if (!records?.length) return
  const db = await getDB()
  const tx = db.transaction(storeName, 'readwrite')
  for (const record of records) {
    await tx.store.put(record)
  }
  await tx.done
}

export async function loadData(storeName: string, limit = 1440): Promise<any[]> {
  const db = await getDB()
  const all = await db.getAll(storeName)
  
  const isRecordInvalid = (d: any): boolean => {
    if (isNaN(new Date(d.time_tag).getTime())) return true;
    if (storeName === 'ace_epam' && d.p47_65 === 0) return true;
    if (storeName === 'ace_sis' && d.p30 === 0) return true;
    return false;
  }

  const invalidRecords = all.filter(isRecordInvalid)
  if (invalidRecords.length > 0) {
    const tx = db.transaction(storeName, 'readwrite')
    for (const record of invalidRecords) {
      try {
        await tx.store.delete(record.time_tag)
      } catch (e) {
        console.error(`Failed to delete invalid record key: ${record.time_tag}`, e)
      }
    }
    await tx.done
  }

  const validRecords = all.filter(d => !isRecordInvalid(d))
  return validRecords
    .sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime())
    .slice(-limit)
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await getDB()
  await db.clear(storeName)
}

export async function getStoreCount(storeName: string): Promise<number> {
  const db = await getDB()
  return db.count(storeName)
}

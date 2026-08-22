/**
 * (Re)creates the two triggers that keep the denormalized ip_address /
 * hostname columns on pc_registrations, devices and servers in sync
 * whenever the owning ip_addresses row changes or is deleted. Extracted
 * verbatim from db.ts.
 */
export async function createSyncTriggers(connection: any) {
  await connection.execute(
    "DROP TRIGGER IF EXISTS trg_ip_addresses_after_update",
  );
  await connection.execute(`
    CREATE TRIGGER trg_ip_addresses_after_update
    AFTER UPDATE ON ip_addresses
    FOR EACH ROW
    BEGIN
      UPDATE pc_registrations
      SET ip_address = NEW.ip_address,
          hostname = COALESCE(NEW.hostname, hostname)
      WHERE ip_address_id = NEW.id;

      UPDATE devices
      SET ip_address = NEW.ip_address,
          hostname = COALESCE(NEW.hostname, hostname)
      WHERE ip_address_id = NEW.id;

      UPDATE servers
      SET ip_address = NEW.ip_address,
          hostname = COALESCE(NEW.hostname, hostname)
      WHERE ip_address_id = NEW.id;
    END
  `);

  await connection.execute(
    "DROP TRIGGER IF EXISTS trg_ip_addresses_before_delete",
  );
  await connection.execute(`
    CREATE TRIGGER trg_ip_addresses_before_delete
    BEFORE DELETE ON ip_addresses
    FOR EACH ROW
    BEGIN
      UPDATE pc_registrations
      SET ip_address = NULL, ip_address_id = NULL
      WHERE ip_address_id = OLD.id;

      UPDATE devices
      SET ip_address = NULL, ip_address_id = NULL
      WHERE ip_address_id = OLD.id;

      UPDATE servers
      SET ip_address = NULL, ip_address_id = NULL
      WHERE ip_address_id = OLD.id;
    END
  `);
}

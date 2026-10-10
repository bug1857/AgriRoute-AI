import {Pool,type PoolClient} from 'pg';
const globalDb=globalThis as typeof globalThis&{agriroutePool?:Pool};
export function database(){if(!process.env.DATABASE_URL)throw new Error('Database unavailable');return globalDb.agriroutePool??=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,statement_timeout:10000});}
export async function transaction<T>(fn:(c:PoolClient)=>Promise<T>){const c=await database().connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function migrate(){await database().query(`
CREATE TABLE IF NOT EXISTS ar_tenants(id uuid PRIMARY KEY,name text NOT NULL);
CREATE TABLE IF NOT EXISTS ar_users(id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES ar_tenants,id_email text UNIQUE NOT NULL,name text NOT NULL,role text NOT NULL CHECK(role IN ('coordinator','farmer')),password_hash text NOT NULL);
CREATE TABLE IF NOT EXISTS ar_sessions(hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES ar_users,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS ar_login_limits(key text PRIMARY KEY,attempts integer NOT NULL,until_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS ar_lots(id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES ar_tenants,name text NOT NULL,farmer_id uuid REFERENCES ar_users,input jsonb NOT NULL,version integer NOT NULL DEFAULT 1,created_by uuid NOT NULL REFERENCES ar_users,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS ar_decisions(id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES ar_tenants,lot_id uuid NOT NULL REFERENCES ar_lots,lot_version integer NOT NULL,status text NOT NULL CHECK(status IN ('pending','approved','rejected')),snapshot jsonb NOT NULL,sha256 text NOT NULL,created_by uuid NOT NULL REFERENCES ar_users,created_at timestamptz NOT NULL DEFAULT now(),reviewed_by uuid REFERENCES ar_users,reviewed_at timestamptz);
CREATE TABLE IF NOT EXISTS ar_offers(id uuid PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES ar_tenants,user_id uuid NOT NULL REFERENCES ar_users,extraction jsonb NOT NULL,confirmed jsonb,status text NOT NULL CHECK(status IN ('pending','confirmed','rejected')),expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS ar_audit(id bigserial PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES ar_tenants,user_id uuid NOT NULL REFERENCES ar_users,action text NOT NULL,record_id uuid NOT NULL,detail jsonb NOT NULL,at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS ar_requests(tenant_id uuid NOT NULL REFERENCES ar_tenants,user_id uuid NOT NULL REFERENCES ar_users,key text NOT NULL,payload_hash text NOT NULL,result jsonb,PRIMARY KEY(tenant_id,user_id,key));
CREATE OR REPLACE FUNCTION ar_immutable() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Immutable record'; END$$;
CREATE OR REPLACE FUNCTION ar_decision_guard() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Decision deletion prohibited'; END IF;
IF OLD.status<>'pending' OR NEW.status NOT IN ('approved','rejected') OR NEW.snapshot<>OLD.snapshot OR NEW.sha256<>OLD.sha256 OR NEW.id<>OLD.id OR NEW.tenant_id<>OLD.tenant_id OR NEW.lot_id<>OLD.lot_id OR NEW.lot_version<>OLD.lot_version OR NEW.created_by<>OLD.created_by OR NEW.created_at<>OLD.created_at OR NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL THEN RAISE EXCEPTION 'Immutable decision or invalid transition'; END IF;RETURN NEW;END$$;
DROP TRIGGER IF EXISTS ar_audit_guard ON ar_audit; CREATE TRIGGER ar_audit_guard BEFORE UPDATE OR DELETE ON ar_audit FOR EACH ROW EXECUTE FUNCTION ar_immutable();
DROP TRIGGER IF EXISTS ar_decisions_guard ON ar_decisions; CREATE TRIGGER ar_decisions_guard BEFORE UPDATE OR DELETE ON ar_decisions FOR EACH ROW EXECUTE FUNCTION ar_decision_guard();
CREATE OR REPLACE FUNCTION ar_offer_guard() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN
IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Offer deletion prohibited'; END IF;
IF NEW.id<>OLD.id OR NEW.tenant_id<>OLD.tenant_id OR NEW.user_id<>OLD.user_id OR NEW.extraction<>OLD.extraction OR NEW.expires_at<>OLD.expires_at OR OLD.status='rejected' OR (OLD.status='confirmed' AND (NEW.status<>'rejected' OR NEW.confirmed IS DISTINCT FROM OLD.confirmed)) OR (OLD.status='pending' AND NEW.status NOT IN ('confirmed','rejected')) OR (NEW.status='confirmed' AND NEW.confirmed IS NULL) THEN RAISE EXCEPTION 'Immutable offer or invalid transition'; END IF;RETURN NEW;END$$;
DROP TRIGGER IF EXISTS ar_offers_guard ON ar_offers; CREATE TRIGGER ar_offers_guard BEFORE UPDATE OR DELETE ON ar_offers FOR EACH ROW EXECUTE FUNCTION ar_offer_guard();
CREATE INDEX IF NOT EXISTS ar_lots_tenant ON ar_lots(tenant_id); CREATE INDEX IF NOT EXISTS ar_decisions_tenant ON ar_decisions(tenant_id);`);}

/**
 * Script para crear el primer administrador.
 * Uso: npx tsx scripts/create-admin.ts
 *
 * Requiere las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(prompt, answer => { rl.close(); resolve(answer.trim()); }));
}

async function main() {
  console.log('\n🔐 Yas&Dani — Crear administrador\n');

  const email = await ask('Email del usuario a promover: ');
  if (!email.includes('@')) { console.error('Email inválido'); process.exit(1); }

  // Buscar usuario en auth
  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) { console.error('Error al listar usuarios:', listErr.message); process.exit(1); }

  const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No se encontró ningún usuario con email: ${email}`);
    console.error('El usuario debe registrarse primero desde la web.');
    process.exit(1);
  }

  // Verificar si ya es admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role === 'administrador') {
    console.log(`✅ El usuario ${email} ya es administrador.`);
    process.exit(0);
  }

  // Promover a administrador
  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ role: 'administrador' })
    .eq('id', user.id);

  if (updateErr) {
    console.error('Error al actualizar rol:', updateErr.message);
    if (updateErr.message.includes('permission denied')) {
      console.error('Ejecuta la migración supabase/migrations/005_fix_admin_role_management.sql y vuelve a intentarlo.');
    }
    process.exit(1);
  }

  // Registrar en auditoría
  await supabase.from('admin_audit_logs').insert({
    action:      'promote_to_admin',
    entity_type: 'profiles',
    entity_id:   user.id,
    details:     { email, promoted_at: new Date().toISOString(), promoted_via: 'create-admin script' },
  });

  console.log(`\n✅ ¡Listo! ${email} ahora es ADMINISTRADOR.`);
  console.log('🔑 Puede iniciar sesión en /login y acceder a /admin\n');
}

main().catch(err => { console.error(err); process.exit(1); });

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  obtenerResumenGlobalAdmin,
  listarUsuariosAdmin,
  crearUsuarioAdmin,
  cambiarRolAdmin,
  eliminarUsuarioAdmin,
  obtenerDetalleUsuarioAdmin,
  listarRegistrosAdmin,
  logout,
  RolUsuario,
} from '../services/api';

export default function AdminScreen() {
  const [tab, setTab] = useState<'usuarios' | 'registros'>('usuarios');
  const [resumenGlobal, setResumenGlobal] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [registros, setRegistros] = useState<any[]>([]);
  const [detalleUsuario, setDetalleUsuario] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Formulario para crear usuario/doctor/admin
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>('usuario');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [creando, setCreando] = useState(false);

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      cargarTodo();
    }, [])
  );

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [resG, users, regs] = await Promise.all([
        obtenerResumenGlobalAdmin(),
        listarUsuariosAdmin(),
        listarRegistrosAdmin(),
      ]);
      setResumenGlobal(resG);
      setUsuarios(users);
      setRegistros(regs);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Acceso denegado', 'Esta vista es exclusiva para administradores.');
        router.replace('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCrearUsuario = async () => {
    if (nuevoNombre.trim().length < 2 || nuevoPassword.length < 4) {
      Alert.alert('Error', 'Ingresa nombre (mín. 2) y contraseña (mín. 4).');
      return;
    }
    setCreando(true);
    try {
      await crearUsuarioAdmin({
        nombre: nuevoNombre.trim(),
        password: nuevoPassword,
        rol: nuevoRol,
        email: nuevoEmail.trim() || undefined,
      });
      setNuevoNombre('');
      setNuevoPassword('');
      setNuevoEmail('');
      setMostrarCrear(false);
      await cargarTodo();
      Alert.alert('Éxito', 'Usuario creado correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo crear el usuario');
    } finally {
      setCreando(false);
    }
  };

  const handleCambiarRol = async (usuarioId: number, rol: RolUsuario) => {
    try {
      await cambiarRolAdmin(usuarioId, rol);
      await cargarTodo();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo cambiar el rol');
    }
  };

  const handleEliminar = (usuarioId: number, nombre: string) => {
    Alert.alert('Confirmar', `¿Eliminar a "${nombre}" y todos sus registros?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarUsuarioAdmin(usuarioId);
            await cargarTodo();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const handleVerDetalle = async (usuarioId: number) => {
    setLoading(true);
    try {
      const data = await obtenerDetalleUsuarioAdmin(usuarioId);
      setDetalleUsuario(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo cargar el detalle');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6A1B9A" />
      </View>
    );
  }

  // Vista de detalle completo de un usuario para Admin
  if (detalleUsuario) {
    const dp = detalleUsuario.datos_personales;
    const calNode = detalleUsuario.resumenes?.calorias?.['Total de Calorías (kcal)'];
    const totalCal = typeof calNode === 'object' && calNode !== null ? calNode['Total de Calorías (kcal)'] : calNode;

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setDetalleUsuario(null)}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Detalle: {dp.nombre} ({dp.rol})</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos Personales</Text>
          <Text style={styles.info}>Email: {dp.email || '-'}</Text>
          <Text style={styles.info}>Teléfono: {dp.telefono || '-'}</Text>
          <Text style={styles.info}>Edad: {dp.edad ?? '-'} • Peso: {dp.peso_kg ?? '-'} kg • Altura: {dp.altura_cm ?? '-'} cm</Text>
          <Text style={styles.info}>Preferencias: {dp.preferencias || '-'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen Nutricional</Text>
          <Text style={styles.bigNumber}>{Number(totalCal || 0).toFixed(1)} kcal</Text>
          <Text style={styles.info}>{detalleUsuario.resumen?.evaluacion_objetivo}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registros de Consumo ({detalleUsuario.registros.length})</Text>
          {detalleUsuario.registros.map((r: any) => (
            <View key={r.id} style={styles.subItem}>
              <Text style={{ fontWeight: 'bold' }}>{r.nombre_consumido} - {r.calorias_totales} kcal</Text>
              <Text style={styles.subText}>{r.ingredientes_consumidos}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Solicitudes de Ayuda ({detalleUsuario.solicitudes.length})</Text>
          {detalleUsuario.solicitudes.map((s: any) => (
            <View key={s.id} style={styles.subItem}>
              <Text style={{ fontWeight: 'bold' }}>{s.motivo} ({s.estado})</Text>
              <Text style={styles.subText}>Doctor: {s.doctor_nombre || 'Sin asignar'} • {s.total_mensajes} mensajes</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Panel Administrador</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      {resumenGlobal && (
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{resumenGlobal.total_usuarios}</Text>
            <Text style={styles.statLabel}>Usuarios</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{resumenGlobal.total_registros_consumo}</Text>
            <Text style={styles.statLabel}>Registros</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{resumenGlobal.total_solicitudes_ayuda}</Text>
            <Text style={styles.statLabel}>Consultas</Text>
          </View>
        </View>
      )}

      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'usuarios' && styles.tabActiva]} onPress={() => setTab('usuarios')}>
          <Text style={[styles.tabText, tab === 'usuarios' && styles.tabTextActiva]}>Usuarios ({usuarios.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'registros' && styles.tabActiva]} onPress={() => setTab('registros')}>
          <Text style={[styles.tabText, tab === 'registros' && styles.tabTextActiva]}>Todos los Registros</Text>
        </TouchableOpacity>
      </View>

      {tab === 'usuarios' ? (
        <>
          <TouchableOpacity style={styles.addBtn} onPress={() => setMostrarCrear(!mostrarCrear)}>
            <Text style={styles.addBtnText}>{mostrarCrear ? 'Cancelar' : '+ Crear Usuario / Doctor / Admin'}</Text>
          </TouchableOpacity>

          {mostrarCrear && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nuevo Usuario</Text>
              <TextInput style={styles.input} placeholder="Nombre de usuario" value={nuevoNombre} onChangeText={setNuevoNombre} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Contraseña" value={nuevoPassword} onChangeText={setNuevoPassword} secureTextEntry />
              <TextInput style={styles.input} placeholder="Email (opcional)" value={nuevoEmail} onChangeText={setNuevoEmail} autoCapitalize="none" />

              <View style={styles.rolesRow}>
                {(['usuario', 'doctor', 'admin'] as RolUsuario[]).map((r) => (
                  <TouchableOpacity key={r} style={[styles.roleChip, nuevoRol === r && styles.roleChipActive]} onPress={() => setNuevoRol(r)}>
                    <Text style={[styles.roleChipText, nuevoRol === r && { color: '#fff' }]}>{r.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleCrearUsuario} disabled={creando}>
                {creando ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Guardar Usuario</Text>}
              </TouchableOpacity>
            </View>
          )}

          {usuarios.map((u) => (
            <View key={u.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.userName}>{u.nombre}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{u.rol.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.info}>Email: {u.email || '-'} • Registros: {u.total_registros} • Consultas: {u.total_solicitudes}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.detailBtn} onPress={() => handleVerDetalle(u.id)}>
                  <Text style={styles.btnWhite}>Ver Todo</Text>
                </TouchableOpacity>
                {(['usuario', 'doctor', 'admin'] as RolUsuario[]).filter(r => r !== u.rol).map((r) => (
                  <TouchableOpacity key={r} style={styles.switchRoleBtn} onPress={() => handleCambiarRol(u.id, r)}>
                    <Text style={styles.switchRoleText}>→ {r}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.delBtn} onPress={() => handleEliminar(u.id, u.nombre)}>
                  <Text style={styles.btnWhite}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      ) : (
        registros.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: 'bold', color: '#6A1B9A' }}>{r.usuario_nombre} ({r.usuario_rol})</Text>
              <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>{r.calorias_totales} kcal</Text>
            </View>
            <Text style={{ fontWeight: 'bold', marginTop: 4 }}>{r.nombre_consumido}</Text>
            <Text style={styles.subText}>{r.ingredientes_consumidos}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#6A1B9A' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', textDecorationLine: 'underline' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', elevation: 2 },
  statNum: { fontSize: 22, fontWeight: '900', color: '#6A1B9A' },
  statLabel: { fontSize: 12, color: '#666' },
  tabsRow: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActiva: { backgroundColor: '#fff' },
  tabText: { color: '#666', fontWeight: 'bold' },
  tabTextActiva: { color: '#6A1B9A' },
  addBtn: { backgroundColor: '#6A1B9A', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 14 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 8 },
  input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10 },
  rolesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roleChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' },
  roleChipActive: { backgroundColor: '#6A1B9A' },
  roleChipText: { fontSize: 12, fontWeight: 'bold', color: '#444' },
  saveBtn: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  roleBadge: { backgroundColor: '#6A1B9A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  info: { fontSize: 13, color: '#555', marginTop: 4 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  detailBtn: { backgroundColor: '#1976D2', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  switchRoleBtn: { backgroundColor: '#eee', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  switchRoleText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  delBtn: { backgroundColor: '#d32f2f', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  btnWhite: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12 },
  backText: { color: '#6A1B9A', fontWeight: 'bold', marginRight: 12 },
  topTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  bigNumber: { fontSize: 26, fontWeight: '900', color: '#4CAF50' },
  subItem: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },
  subText: { fontSize: 12, color: '#666' },
});

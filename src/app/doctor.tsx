import React, { useState, useEffect, useCallback } from 'react';
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
  listarPacientesDoctor,
  obtenerDetallePacienteDoctor,
  atenderSolicitudDoctor,
  obtenerMensajesChat,
  enviarMensajeChat,
  cambiarEstadoSolicitud,
  logout,
  MensajeChat,
  SolicitudAyuda,
} from '../services/api';

export default function DoctorScreen() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [detallePaciente, setDetallePaciente] = useState<any>(null);
  const [solicitudChat, setSolicitudChat] = useState<SolicitudAyuda | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      cargarPacientes();
    }, [])
  );

  useEffect(() => {
    if (!solicitudChat) return;
    const interval = setInterval(() => {
      cargarChat(solicitudChat.id, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [solicitudChat?.id]);

  const cargarPacientes = async () => {
    setLoading(true);
    try {
      const data = await listarPacientesDoctor();
      setPacientes(data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Acceso denegado', 'Esta vista es exclusiva para doctores.');
        router.replace('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const abrirPaciente = async (pacienteId: number) => {
    setLoading(true);
    try {
      const data = await obtenerDetallePacienteDoctor(pacienteId);
      setDetallePaciente(data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo cargar el expediente del paciente');
    } finally {
      setLoading(false);
    }
  };

  const cargarChat = async (solicitudId: number, mostrarError = true) => {
    try {
      const data = await obtenerMensajesChat(solicitudId);
      setSolicitudChat(data.solicitud);
      setMensajes(data.mensajes);
    } catch {
      if (mostrarError) Alert.alert('Error', 'No se pudo abrir el chat');
    }
  };

  const handleAtender = async (solicitudId: number, pacienteId: number) => {
    try {
      await atenderSolicitudDoctor(solicitudId);
      await abrirPaciente(pacienteId);
      Alert.alert('Listo', 'Has tomado esta consulta.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo asignar la solicitud');
    }
  };

  const handleEnviarMensaje = async () => {
    if (!solicitudChat || !nuevoMensaje.trim()) return;
    setEnviando(true);
    try {
      await enviarMensajeChat(solicitudChat.id, nuevoMensaje.trim());
      setNuevoMensaje('');
      await cargarChat(solicitudChat.id, false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const handleCerrarConsulta = async (solicitudId: number) => {
    try {
      await cambiarEstadoSolicitud(solicitudId, 'cerrada');
      await cargarChat(solicitudId, false);
      Alert.alert('Consulta cerrada', 'La solicitud fue marcada como cerrada.');
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login' as any);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  // Vista 3: Chat directo con el paciente
  if (solicitudChat) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { setSolicitudChat(null); if (detallePaciente) abrirPaciente(detallePaciente.datos_personales.id); }}>
            <Text style={styles.backText}>← Expediente</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            Chat con {solicitudChat.paciente_nombre}
          </Text>
          {solicitudChat.estado !== 'cerrada' && (
            <TouchableOpacity onPress={() => handleCerrarConsulta(solicitudChat.id)}>
              <Text style={styles.closeSolText}>Cerrar</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 8 }}>
          {mensajes.map((m) => {
            const esDoctor = m.remitente_rol === 'doctor';
            return (
              <View key={m.id} style={[styles.msgBubble, esDoctor ? styles.msgMio : styles.msgPaciente]}>
                <Text style={styles.msgSender}>{m.remitente_nombre} ({m.remitente_rol})</Text>
                <Text style={[styles.msgText, esDoctor && { color: '#fff' }]}>{m.contenido}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            placeholder="Responder al paciente..."
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleEnviarMensaje} disabled={enviando}>
            {enviando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendBtnText}>Enviar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Vista 2: Expediente completo del paciente que solicitó ayuda
  if (detallePaciente) {
    const dp = detallePaciente.datos_personales;
    const res = detallePaciente.resumen;
    const macros = detallePaciente.resumenes?.macros?.['Desglose de Macronutrientes'];
    const alertas = detallePaciente.resumenes?.azucar_sodio?.['Desglose de Azúcar y Sodio'];
    const calNode = detallePaciente.resumenes?.calorias?.['Total de Calorías (kcal)'];
    const totalCal = typeof calNode === 'object' && calNode !== null ? calNode['Total de Calorías (kcal)'] : calNode;

    return (
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => { setDetallePaciente(null); cargarPacientes(); }}>
            <Text style={styles.backText}>← Pacientes</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Expediente: {dp.nombre}</Text>
        </View>

        {/* Datos Personales */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Datos Personales</Text>
          <Text style={styles.infoRow}>Nombre: {dp.nombre}</Text>
          <Text style={styles.infoRow}>Email: {dp.email || 'No registrado'}</Text>
          <Text style={styles.infoRow}>Teléfono: {dp.telefono || 'No registrado'}</Text>
          <Text style={styles.infoRow}>
            Edad: {dp.edad ?? '-'} años • Peso: {dp.peso_kg ?? '-'} kg • Altura: {dp.altura_cm ?? '-'} cm
          </Text>
          <Text style={styles.infoRow}>Preferencias: {dp.preferencias || 'Sin especificar'}</Text>
        </View>

        {/* Resumen Nutricional */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen Nutricional</Text>
          <Text style={styles.bigCal}>{Number(totalCal || 0).toFixed(1)} kcal</Text>
          {macros && (
            <Text style={styles.infoRow}>
              Proteína: {macros.proteina_g}g • Carbos: {macros.carbohidratos_g}g • Grasas: {macros.grasas_g}g
            </Text>
          )}
          {alertas && (
            <Text style={styles.infoRow}>
              Azúcar: {alertas.azucar_g}g • Sodio: {alertas.sodio_mg}mg
            </Text>
          )}
          {res?.objetivo && (
            <Text style={styles.infoRow}>
              Meta: {res.objetivo.calorias_meta} kcal / {res.objetivo.proteina_meta}g proteína
            </Text>
          )}
          <Text style={styles.evalText}>{res?.evaluacion_objetivo}</Text>
        </View>

        {/* Solicitudes y Chat */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consultas y Chat</Text>
          {detallePaciente.solicitudes.map((sol: SolicitudAyuda) => (
            <View key={sol.id} style={styles.solItem}>
              <Text style={styles.solMotivo}>{sol.motivo}</Text>
              <Text style={styles.solMeta}>Estado: {sol.estado} • {sol.total_mensajes} mensajes</Text>
              <View style={styles.solActions}>
                {!sol.doctor_id && (
                  <TouchableOpacity style={styles.atenderBtn} onPress={() => handleAtender(sol.id, dp.id)}>
                    <Text style={styles.btnTextWhite}>Atender</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.chatBtn} onPress={() => cargarChat(sol.id)}>
                  <Text style={styles.btnTextWhite}>💬 Abrir Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Registros de Consumo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registros de Consumo ({detallePaciente.registros.length})</Text>
          {detallePaciente.registros.length === 0 ? (
            <Text style={styles.emptyText}>Este paciente aún no registra comidas.</Text>
          ) : (
            detallePaciente.registros.map((r: any) => (
              <View key={r.id} style={styles.regItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.regName}>{r.nombre_consumido}</Text>
                  <Text style={styles.regCal}>{r.calorias_totales} kcal</Text>
                </View>
                <Text style={styles.regIng}>{r.ingredientes_consumidos}</Text>
                <Text style={styles.regMacros}>
                  P: {r.proteina_total}g | C: {r.carbohidratos_total}g | G: {r.grasas_total}g
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  // Vista 1: Lista de pacientes que solicitaron ayuda
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Pacientes en Consulta</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity onPress={cargarPacientes}>
            <Text style={styles.refreshLink}>↻ Actualizar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {pacientes.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>
            Ningún usuario ha solicitado ayuda médica todavía.
          </Text>
        </View>
      ) : (
        pacientes.map((item, idx) => (
          <TouchableOpacity
            key={`${item.paciente.id}-${idx}`}
            style={styles.card}
            onPress={() => abrirPaciente(item.paciente.id)}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.patientName}>{item.paciente.nombre}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.ultima_solicitud.estado}</Text>
              </View>
            </View>
            <Text style={styles.infoRow}>Motivo: {item.ultima_solicitud.motivo}</Text>
            <Text style={styles.solMeta}>
              Registros: {item.total_registros} • Edad: {item.paciente.edad ?? '-'} • Peso: {item.paciente.peso_kg ?? '-'} kg
            </Text>
            <Text style={styles.verMas}>Toca para ver resumen, registros, datos y chat →</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1565C0' },
  refreshLink: { color: '#1976D2', fontWeight: 'bold' },
  logoutText: { color: '#d32f2f', fontWeight: 'bold', textDecorationLine: 'underline' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1565C0', marginBottom: 8 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  badge: { backgroundColor: '#1976D2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  infoRow: { fontSize: 14, color: '#444', marginBottom: 4 },
  solMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  verMas: { fontSize: 13, color: '#1976D2', fontWeight: 'bold', marginTop: 8 },
  emptyText: { color: '#777', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 12, elevation: 2 },
  backText: { color: '#1976D2', fontWeight: 'bold', fontSize: 15 },
  topTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', flex: 1, textAlign: 'center' },
  closeSolText: { color: '#d32f2f', fontWeight: 'bold' },
  bigCal: { fontSize: 28, fontWeight: '900', color: '#4CAF50', marginBottom: 6 },
  evalText: { fontSize: 13, color: '#FF9800', fontStyle: 'italic', marginTop: 6 },
  solItem: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 8 },
  solMotivo: { fontSize: 14, fontWeight: 'bold', color: '#222' },
  solActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  atenderBtn: { backgroundColor: '#FF9800', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  chatBtn: { backgroundColor: '#1976D2', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  regItem: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 8 },
  regName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  regCal: { fontSize: 14, fontWeight: 'bold', color: '#4CAF50' },
  regIng: { fontSize: 12, color: '#666', marginTop: 2 },
  regMacros: { fontSize: 12, color: '#888', marginTop: 2 },
  msgBubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '82%' },
  msgMio: { alignSelf: 'flex-end', backgroundColor: '#1976D2' },
  msgPaciente: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  msgSender: { fontSize: 10, color: '#555', marginBottom: 3, fontWeight: 'bold' },
  msgText: { fontSize: 14, color: '#222' },
  chatInputRow: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  chatInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  sendBtn: { backgroundColor: '#1976D2', paddingHorizontal: 18, justifyContent: 'center', borderRadius: 10 },
  sendBtnText: { color: '#fff', fontWeight: 'bold' },
});

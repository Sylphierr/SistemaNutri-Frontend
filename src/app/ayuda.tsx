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
import { useFocusEffect } from 'expo-router';
import {
  listarDoctores,
  crearSolicitudAyuda,
  listarSolicitudes,
  obtenerMensajesChat,
  enviarMensajeChat,
  PerfilUsuario,
  SolicitudAyuda,
  MensajeChat,
} from '../services/api';

export default function AyudaScreen() {
  const [doctores, setDoctores] = useState<PerfilUsuario[]>([]);
  const [doctorSeleccionado, setDoctorSeleccionado] = useState<number | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviandoSol, setEnviandoSol] = useState(false);

  const [solicitudes, setSolicitudes] = useState<SolicitudAyuda[]>([]);
  const [solicitudActiva, setSolicitudActiva] = useState<SolicitudAyuda | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviandoMsg, setEnviandoMsg] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  // Refresco automático de mensajes cuando hay un chat abierto
  useEffect(() => {
    if (!solicitudActiva) return;
    const interval = setInterval(() => {
      cargarMensajes(solicitudActiva.id, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [solicitudActiva?.id]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [docs, sols] = await Promise.all([listarDoctores(), listarSolicitudes()]);
      setDoctores(docs);
      setSolicitudes(sols);
    } catch (error) {
      console.error('Error cargando datos de ayuda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearSolicitud = async () => {
    if (motivo.trim().length < 3) {
      Alert.alert('Aviso', 'Escribe el motivo de tu consulta (mínimo 3 caracteres).');
      return;
    }
    setEnviandoSol(true);
    try {
      const res = await crearSolicitudAyuda(motivo.trim(), doctorSeleccionado);
      setMotivo('');
      await cargarDatos();
      if (res.solicitud) {
        await cargarMensajes(res.solicitud.id);
      }
      Alert.alert('¡Solicitud enviada!', 'Un doctor podrá revisar tu historial y responderte por chat.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo enviar la solicitud');
    } finally {
      setEnviandoSol(false);
    }
  };

  const cargarMensajes = async (solicitudId: number, mostrarLoader = true) => {
    try {
      const data = await obtenerMensajesChat(solicitudId);
      setSolicitudActiva(data.solicitud);
      setMensajes(data.mensajes);
    } catch (error) {
      if (mostrarLoader) {
        Alert.alert('Error', 'No se pudieron cargar los mensajes del chat.');
      }
    }
  };

  const handleEnviarMensaje = async () => {
    if (!solicitudActiva || !nuevoMensaje.trim()) return;
    setEnviandoMsg(true);
    try {
      await enviarMensajeChat(solicitudActiva.id, nuevoMensaje.trim());
      setNuevoMensaje('');
      await cargarMensajes(solicitudActiva.id, false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo enviar el mensaje');
    } finally {
      setEnviandoMsg(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Vista de Chat activo
  if (solicitudActiva) {
    return (
      <View style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => { setSolicitudActiva(null); cargarDatos(); }}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {solicitudActiva.doctor_nombre
                ? `Dr. ${solicitudActiva.doctor_nombre}`
                : 'Esperando Doctor...'}
            </Text>
            <Text style={styles.chatSubtitle} numberOfLines={1}>
              {solicitudActiva.motivo} ({solicitudActiva.estado})
            </Text>
          </View>
          <TouchableOpacity onPress={() => cargarMensajes(solicitudActiva.id)}>
            <Text style={styles.refreshBtn}>↻</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.chatMessages} contentContainerStyle={{ paddingVertical: 10 }}>
          {mensajes.map((msg) => {
            const esMio = msg.remitente_rol === 'usuario';
            return (
              <View
                key={msg.id}
                style={[styles.msgBubble, esMio ? styles.msgMio : styles.msgDoctor]}
              >
                <Text style={styles.msgSender}>
                  {msg.remitente_nombre} ({msg.remitente_rol})
                </Text>
                <Text style={[styles.msgText, esMio && { color: '#fff' }]}>
                  {msg.contenido}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            placeholder="Escribe tu mensaje al doctor..."
            value={nuevoMensaje}
            onChangeText={setNuevoMensaje}
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleEnviarMensaje}
            disabled={enviandoMsg}
          >
            {enviandoMsg ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendBtnText}>Enviar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Solicitar Ayuda Médica</Text>
        <Text style={styles.helperText}>
          Al solicitar ayuda, el doctor podrá consultar tus datos personales, resumen nutricional y registros para asesorarte.
        </Text>

        <Text style={styles.label}>Seleccionar Doctor (opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <TouchableOpacity
            style={[styles.chip, doctorSeleccionado === null && styles.chipActivo]}
            onPress={() => setDoctorSeleccionado(null)}
          >
            <Text style={[styles.chipText, doctorSeleccionado === null && styles.chipTextActivo]}>
              Cualquiera disponible
            </Text>
          </TouchableOpacity>
          {doctores.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[styles.chip, doctorSeleccionado === doc.id && styles.chipActivo]}
              onPress={() => setDoctorSeleccionado(doc.id)}
            >
              <Text style={[styles.chipText, doctorSeleccionado === doc.id && styles.chipTextActivo]}>
                Dr. {doc.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>¿En qué necesitas ayuda?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ej. Quiero ajustar mis calorías o revisar mis macros..."
          value={motivo}
          onChangeText={setMotivo}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleCrearSolicitud}
          disabled={enviandoSol}
        >
          {enviandoSol ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Enviar Solicitud y Abrir Chat</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.listHeader}>Mis Consultas y Chats</Text>
      {solicitudes.length === 0 ? (
        <Text style={styles.emptyText}>No tienes solicitudes de ayuda aún.</Text>
      ) : (
        solicitudes.map((sol) => (
          <TouchableOpacity
            key={sol.id}
            style={styles.solCard}
            onPress={() => cargarMensajes(sol.id)}
          >
            <View style={styles.solTop}>
              <Text style={styles.solMotivo} numberOfLines={1}>{sol.motivo}</Text>
              <View style={[styles.badge, sol.estado === 'en_atencion' && styles.badgeAtencion, sol.estado === 'cerrada' && styles.badgeCerrada]}>
                <Text style={styles.badgeText}>{sol.estado}</Text>
              </View>
            </View>
            <Text style={styles.solMeta}>
              {sol.doctor_nombre ? `Doctor: ${sol.doctor_nombre}` : 'Sin doctor asignado aún'} • {sol.total_mensajes} mensajes
            </Text>
            {sol.ultimo_mensaje && (
              <Text style={styles.solLastMsg} numberOfLines={1}>
                Último: {sol.ultimo_mensaje}
              </Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32', marginBottom: 6 },
  helperText: { fontSize: 12, color: '#666', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#eee', marginRight: 8 },
  chipActivo: { backgroundColor: '#4CAF50' },
  chipText: { color: '#555', fontWeight: '600', fontSize: 13 },
  chipTextActivo: { color: '#fff' },
  textArea: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, minHeight: 75, textAlignVertical: 'top', marginBottom: 14 },
  primaryBtn: { backgroundColor: '#4CAF50', padding: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  listHeader: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyText: { color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  solCard: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, elevation: 2 },
  solTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  solMotivo: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#222', marginRight: 8 },
  badge: { backgroundColor: '#FF9800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeAtencion: { backgroundColor: '#2196F3' },
  badgeCerrada: { backgroundColor: '#9E9E9E' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  solMeta: { fontSize: 12, color: '#666' },
  solLastMsg: { fontSize: 12, color: '#4CAF50', marginTop: 4, fontStyle: 'italic' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, elevation: 2 },
  backText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 15 },
  chatTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  chatSubtitle: { fontSize: 12, color: '#666' },
  refreshBtn: { fontSize: 22, color: '#4CAF50', fontWeight: 'bold', paddingHorizontal: 8 },
  chatMessages: { flex: 1 },
  msgBubble: { padding: 12, borderRadius: 12, marginBottom: 8, maxWidth: '82%' },
  msgMio: { alignSelf: 'flex-end', backgroundColor: '#4CAF50' },
  msgDoctor: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  msgSender: { fontSize: 10, color: '#555', marginBottom: 3, fontWeight: 'bold' },
  msgText: { fontSize: 14, color: '#222' },
  chatInputRow: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  chatInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  sendBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 18, justifyContent: 'center', borderRadius: 10 },
  sendBtnText: { color: '#fff', fontWeight: 'bold' },
});

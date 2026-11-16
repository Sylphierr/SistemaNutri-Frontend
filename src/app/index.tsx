import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { obtenerReporte } from '../services/api';

export default function DashboardScreen() {
  const [reporte, setReporte] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const USUARIO_ID = 1;

  // useFocusEffect recarga los datos cada vez que la pantalla vuelve a estar activa
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await obtenerReporte(USUARIO_ID, 'calorias');
      setReporte(data);
    } catch (error) {
      console.error("Error al cargar el reporte:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <>
          <Text style={styles.title}>Resumen del Día</Text>
          {reporte && (
            <View style={styles.card}>
              <Text style={styles.usuario}>Hola, {reporte.usuario}</Text>
              <Text style={styles.resultado}>
                {reporte.resultado['Total de Calorías (kcal)']} kcal
              </Text>
              <Text style={styles.subtitle}>Consumidas hoy</Text>
            </View>
          )}
        </>
      )}

      {/* Botón para navegar a la pantalla de registro usando Expo Router */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/registro')}
      >
        <Text style={styles.fabText}>+ Registrar Comida</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 5 },
  usuario: { fontSize: 18, color: '#666', marginBottom: 10 },
  resultado: { fontSize: 36, fontWeight: '900', color: '#4CAF50' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 5 },
  fab: { position: 'absolute', bottom: 30, right: 20, left: 20, backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

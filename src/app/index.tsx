import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { obtenerReporte } from '../services/api';

type TipoEstrategia = 'calorias' | 'macros' | 'azucar_sodio';

export default function DashboardScreen() {
  const [reporte, setReporte] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [estrategiaActiva, setEstrategiaActiva] = useState<TipoEstrategia>('calorias');
  const router = useRouter();

  const USUARIO_ID = 1; // Temporal hasta aplicar JWT

  // Recarga los datos cuando la pantalla entra en foco O cuando cambia la estrategia
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [estrategiaActiva])
  );

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // Le pasamos la estrategia actual a tu API en Flask
      const data = await obtenerReporte(USUARIO_ID, estrategiaActiva);
      setReporte(data);
    } catch (error) {
      console.error("Error al cargar el reporte:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para renderizar dinámicamente según la estrategia del backend
  const renderizarResultadosStrategy = () => {
    if (!reporte?.resultado) return null;

    if (estrategiaActiva === 'calorias') {
      return (
        <Text style={styles.resultadoPrincipal}>
          {reporte.resultado['Total de Calorías (kcal)']} kcal
        </Text>
      );
    }

    if (estrategiaActiva === 'macros') {
      const macros = reporte.resultado['Desglose de Macronutrientes'];
      if (!macros) return null;
      return (
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Proteína</Text>
            <Text style={styles.gridValue}>{macros.proteina_g}g</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Carbos</Text>
            <Text style={styles.gridValue}>{macros.carbohidratos_g}g</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Grasas</Text>
            <Text style={styles.gridValue}>{macros.grasas_g}g</Text>
          </View>
        </View>
      );
    }

    if (estrategiaActiva === 'azucar_sodio') {
      const azucarSodio = reporte.resultado['Desglose de Azúcar y Sodio'];
      if (!azucarSodio) return null;
      return (
        <View style={styles.gridContainer}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Azúcar</Text>
            <Text style={styles.gridValue}>{azucarSodio.azucar_g}g</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Sodio</Text>
            <Text style={styles.gridValue}>{azucarSodio.sodio_mg}mg</Text>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Botones selectores del Patrón Strategy */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[styles.tabButton, estrategiaActiva === 'calorias' && styles.tabActivo]}
          onPress={() => setEstrategiaActiva('calorias')}
        >
          <Text style={[styles.tabText, estrategiaActiva === 'calorias' && styles.tabTextActivo]}>Calorías</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, estrategiaActiva === 'macros' && styles.tabActivo]}
          onPress={() => setEstrategiaActiva('macros')}
        >
          <Text style={[styles.tabText, estrategiaActiva === 'macros' && styles.tabTextActivo]}>Macros</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, estrategiaActiva === 'azucar_sodio' && styles.tabActivo]}
          onPress={() => setEstrategiaActiva('azucar_sodio')}
        >
          <Text style={[styles.tabText, estrategiaActiva === 'azucar_sodio' && styles.tabTextActivo]}>Alertas</Text>
        </TouchableOpacity>
      </View>

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

              {/* Aquí se inyecta el UI dinámico dependiendo de la estrategia */}
              {renderizarResultadosStrategy()}

              {estrategiaActiva === 'calorias' && (
                <Text style={styles.aviso}>{reporte.evaluacion_objetivo}</Text>
              )}
            </View>
          )}
        </>
      )}

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

  // Estilos para los selectores de Strategy
  selectorContainer: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActivo: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { color: '#666', fontWeight: 'bold' },
  tabTextActivo: { color: '#4CAF50' },

  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 5 },
  usuario: { fontSize: 18, color: '#666', marginBottom: 15 },

  // Estilos de resultados
  resultadoPrincipal: { fontSize: 36, fontWeight: '900', color: '#4CAF50' },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 10 },
  gridItem: { alignItems: 'center' },
  gridLabel: { fontSize: 14, color: '#999', marginBottom: 5 },
  gridValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },

  aviso: { fontSize: 12, color: '#FF9800', marginTop: 15, textAlign: 'center', fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 30, right: 20, left: 20, backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

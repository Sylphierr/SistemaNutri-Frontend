import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { obtenerReporte, actualizarObjetivo } from '../services/api';

type TipoEstrategia = 'calorias' | 'macros' | 'azucar_sodio';

export default function DashboardScreen() {
  const [reporte, setReporte] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [estrategiaActiva, setEstrategiaActiva] = useState<TipoEstrategia>('calorias');

  // Estados para editar el Objetivo Nutricional del usuario
  const [mostrarEditorMeta, setMostrarEditorMeta] = useState(false);
  const [metaCaloriasInput, setMetaCaloriasInput] = useState('');
  const [metaProteinaInput, setMetaProteinaInput] = useState('');
  const [guardandoMeta, setGuardandoMeta] = useState(false);

  const router = useRouter();

  // Recarga los datos cuando la pantalla entra en foco O cuando cambia la estrategia
  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [estrategiaActiva])
  );

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const data = await obtenerReporte(estrategiaActiva);
      setReporte(data);
      if (data?.objetivo) {
        setMetaCaloriasInput(String(data.objetivo.calorias_meta));
        setMetaProteinaInput(String(data.objetivo.proteina_meta));
      }
    } catch (error) {
      console.error("Error al cargar el reporte:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarObjetivo = async () => {
    const cal = parseFloat(metaCaloriasInput);
    const prot = parseFloat(metaProteinaInput);
    if (isNaN(cal) || cal <= 0 || isNaN(prot) || prot <= 0) {
      Alert.alert('Error', 'Ingresa valores numéricos mayores a 0 para calorías y proteína.');
      return;
    }

    setGuardandoMeta(true);
    try {
      await actualizarObjetivo(cal, prot);
      setMostrarEditorMeta(false);
      await cargarDatos();
      Alert.alert('¡Listo!', 'Tu objetivo nutricional ha sido actualizado.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el objetivo');
    } finally {
      setGuardandoMeta(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    router.replace('/login' as any);
  };

  // Formatea cualquier número a máximo 1 decimal (ej. 38.2000000003 -> 38.2, 100.0 -> 100)
  const formatearDecimal = (valor: number | undefined) => {
    if (valor === undefined || valor === null || isNaN(Number(valor))) return '0';
    return Number(Number(valor).toFixed(1)).toString();
  };

  // Función para renderizar dinámicamente según la estrategia del backend
  const renderizarResultadosStrategy = () => {
    if (!reporte?.resultado) return null;

    if (estrategiaActiva === 'calorias') {
      const nodoCalorias = reporte.resultado['Total de Calorías (kcal)'];
      const totalCalorias =
        typeof nodoCalorias === 'object' && nodoCalorias !== null
          ? nodoCalorias['Total de Calorías (kcal)']
          : nodoCalorias;

      return (
        <Text style={styles.resultadoPrincipal}>
          {formatearDecimal(totalCalorias)} kcal
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
            <Text style={styles.gridValue}>{formatearDecimal(macros.proteina_g)}g</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Carbos</Text>
            <Text style={styles.gridValue}>{formatearDecimal(macros.carbohidratos_g)}g</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Grasas</Text>
            <Text style={styles.gridValue}>{formatearDecimal(macros.grasas_g)}g</Text>
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
            <Text style={styles.gridValue}>{formatearDecimal(azucarSodio.azucar_g)}g</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Sodio</Text>
            <Text style={styles.gridValue}>{formatearDecimal(azucarSodio.sodio_mg)}mg</Text>
          </View>
        </View>
      );
    }
  };

  // Segundo banner exclusivo para el desglose de platillos en la pestaña Calorías
  const renderizarBannerPlatillos = () => {
    if (estrategiaActiva !== 'calorias' || !reporte?.resultado) return null;

    const nodoCalorias = reporte.resultado['Total de Calorías (kcal)'];
    const desglose: Array<{ nombre: string; ingredientes: string; calorias: number }> =
      (typeof nodoCalorias === 'object' && nodoCalorias !== null
        ? nodoCalorias.desglose
        : reporte.resultado.desglose) || [];

    return (
      <View style={[styles.card, styles.secondBannerCard]}>
        <Text style={styles.desgloseHeader}>Platillos consumidos hoy:</Text>

        {desglose.length === 0 ? (
          <Text style={styles.emptyDesglose}>Aún no hay platillos registrados hoy.</Text>
        ) : (
          <View style={styles.desgloseList}>
            {desglose.map((item, idx) => (
              <View key={`${item.nombre}-${idx}`} style={styles.platilloBanner}>
                <View style={styles.platilloTopRow}>
                  <Text style={styles.platilloNombre} numberOfLines={1}>
                    {item.nombre}
                  </Text>
                  <Text style={styles.platilloCalorias}>
                    {formatearDecimal(item.calorias)} kcal
                  </Text>
                </View>
                <Text
                  style={styles.platilloIngredientes}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.ingredientes}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>Resumen del Día</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.editGoalBtn}
                onPress={() => setMostrarEditorMeta(!mostrarEditorMeta)}
              >
                <Text style={styles.editGoalBtnText}>
                  {mostrarEditorMeta ? 'Cerrar Meta' : '⚙ Meta'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout}>
                <Text style={styles.logoutText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>

          {mostrarEditorMeta && (
            <View style={styles.goalEditorCard}>
              <Text style={styles.goalEditorTitle}>Configurar Objetivo Diario</Text>
              <View style={styles.goalInputsRow}>
                <View style={styles.goalInputGroup}>
                  <Text style={styles.goalInputLabel}>Meta Calorías (kcal)</Text>
                  <TextInput
                    style={styles.goalInput}
                    keyboardType="numeric"
                    value={metaCaloriasInput}
                    onChangeText={setMetaCaloriasInput}
                    placeholder="2500"
                  />
                </View>
                <View style={styles.goalInputGroup}>
                  <Text style={styles.goalInputLabel}>Meta Proteína (g)</Text>
                  <TextInput
                    style={styles.goalInput}
                    keyboardType="numeric"
                    value={metaProteinaInput}
                    onChangeText={setMetaProteinaInput}
                    placeholder="160"
                  />
                </View>
              </View>
              <TouchableOpacity
                style={styles.saveGoalBtn}
                onPress={handleGuardarObjetivo}
                disabled={guardandoMeta}
              >
                {guardandoMeta ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveGoalBtnText}>Guardar Objetivo</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {reporte && (
            <>
              {/* Primer Banner: Resumen principal de calorías / estrategia */}
              <View style={styles.card}>
                <Text style={styles.usuario}>Hola, {reporte.usuario}</Text>

                {/* Aquí se inyecta el UI dinámico dependiendo de la estrategia */}
                {renderizarResultadosStrategy()}

                {estrategiaActiva === 'calorias' && (
                  <Text style={styles.aviso}>{reporte.evaluacion_objetivo}</Text>
                )}

                {reporte.tendencias && (
                  <View style={styles.tendenciaBox}>
                    <Text style={styles.tendenciaText}>{reporte.tendencias}</Text>
                  </View>
                )}
              </View>

              {/* Segundo Banner: Platillos consumidos hoy */}
              {renderizarBannerPlatillos()}

              {/* Aviso Legal obligatorio */}
              {reporte.aviso_legal && (
                <Text style={styles.avisoLegal}>{reporte.aviso_legal}</Text>
              )}
            </>
          )}
        </ScrollView>
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutText: {
    color: '#d32f2f',
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  editGoalBtn: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  editGoalBtnText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: 'bold',
  },
  goalEditorCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    elevation: 3,
  },
  goalEditorTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 12,
  },
  goalInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  goalInputGroup: {
    flex: 1,
  },
  goalInputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  goalInput: {
    backgroundColor: '#f9fbf9',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
  },
  saveGoalBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveGoalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 5 },
  secondBannerCard: { marginTop: 18 },
  usuario: { fontSize: 18, color: '#666', marginBottom: 15 },

  // Estilos de resultados
  resultadoPrincipal: { fontSize: 36, fontWeight: '900', color: '#4CAF50' },
  desgloseHeader: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  desgloseList: {
    width: '100%',
    gap: 10,
  },
  platilloBanner: {
    width: '100%',
    backgroundColor: '#f9fbf9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e3ece4',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  platilloTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  platilloNombre: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
    marginRight: 10,
  },
  platilloCalorias: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  platilloIngredientes: {
    fontSize: 13,
    color: '#777',
  },
  emptyDesglose: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  gridContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 10 },
  gridItem: { alignItems: 'center' },
  gridLabel: { fontSize: 14, color: '#999', marginBottom: 5 },
  gridValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },

  aviso: { fontSize: 13, color: '#FF9800', marginTop: 14, textAlign: 'center', fontStyle: 'italic' },
  tendenciaBox: {
    marginTop: 12,
    backgroundColor: '#f1f8e9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
  },
  tendenciaText: {
    fontSize: 12,
    color: '#33691e',
    textAlign: 'center',
    fontWeight: '600',
  },
  avisoLegal: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },
  fab: { position: 'absolute', bottom: 30, right: 20, left: 20, backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 5 },
  fabText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

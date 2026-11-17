import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Switch,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
    registrarConsumo,
    crearAlimentoPersonalizado,
    obtenerCatalogoAlimentos,
} from '../services/api';

interface AlimentoCatalogo {
    id?: number;
    nombre: string;
    grupo?: string;
    tipo_factory?: string;
    calorias?: number;
}

export default function RegistroScreen() {
    // Catálogo descargado desde el backend y selección de checkboxes
    const [catalogo, setCatalogo] = useState<AlimentoCatalogo[]>([]);
    const [cargandoCatalogo, setCargandoCatalogo] = useState<boolean>(true);
    const [seleccionados, setSeleccionados] = useState<string[]>([]);

    // Estados de los patrones Composite, Factory y Decorator
    const [listaAlimentos, setListaAlimentos] = useState<string[]>([]);
    const [esVegano, setEsVegano] = useState<boolean>(false);
    const [tipoPlatillo, setTipoPlatillo] = useState<'desayuno' | 'comida'>('comida');
    const [loading, setLoading] = useState<boolean>(false);

    // Estados para el desplegable "Crear alimento personalizado"
    const [mostrarCreador, setMostrarCreador] = useState<boolean>(false);
    const [nuevoNombre, setNuevoNombre] = useState<string>('');
    const [nuevoGrupo, setNuevoGrupo] = useState<'Proteina' | 'Fruta' | 'Verdura'>('Proteina');
    const [creandoAlimento, setCreandoAlimento] = useState<boolean>(false);

    const router = useRouter();

    useEffect(() => {
        cargarCatalogo();
    }, []);

    const cargarCatalogo = async () => {
        setCargandoCatalogo(true);
        try {
            const data = await obtenerCatalogoAlimentos();
            const listaRaw = Array.isArray(data) ? data : data?.alimentos || [];
            const normalizados: AlimentoCatalogo[] = listaRaw.map((item: any) =>
                typeof item === 'string' ? { nombre: item } : item
            );
            setCatalogo(normalizados);
        } catch (error) {
            console.error('Error al cargar el catálogo de alimentos:', error);
            Alert.alert('Aviso', 'No se pudo cargar el catálogo de alimentos desde el servidor.');
        } finally {
            setCargandoCatalogo(false);
        }
    };

    // Alternar selección de checkbox en el catálogo
    const toggleSeleccion = (nombre: string) => {
        setSeleccionados((prev) =>
            prev.includes(nombre)
                ? prev.filter((item) => item !== nombre)
                : [...prev, nombre]
        );
    };

    // Pasar los checkboxes marcados a la lista final del platillo (Composite)
    const agregarSeleccionadosAlPlatillo = () => {
        if (seleccionados.length === 0) {
            Alert.alert('Aviso', 'Selecciona al menos un ingrediente del catálogo.');
            return;
        }
        setListaAlimentos((prev) => [...prev, ...seleccionados]);
        setSeleccionados([]);
    };

    const eliminarIngrediente = (index: number) => {
        const nuevaLista = [...listaAlimentos];
        nuevaLista.splice(index, 1);
        setListaAlimentos(nuevaLista);
    };

    // Crear alimento personalizado (Factory en Backend)
    const handleCrearPersonalizado = async () => {
        const nombreLimpio = nuevoNombre.trim();
        if (nombreLimpio.length < 2) {
            Alert.alert('Error', 'Ingresa un nombre válido (mínimo 2 caracteres).');
            return;
        }
        setCreandoAlimento(true);
        try {
            await crearAlimentoPersonalizado(nombreLimpio, nuevoGrupo);
            Alert.alert('¡Catálogo Actualizado!', `Agregamos "${nombreLimpio}" como ${nuevoGrupo}.`);

            // Recargamos el catálogo y lo añadimos también al platillo actual
            await cargarCatalogo();
            setListaAlimentos((prev) => [...prev, nombreLimpio]);

            setNuevoNombre('');
            setMostrarCreador(false);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'No se pudo crear el alimento');
        } finally {
            setCreandoAlimento(false);
        }
    };

    // Registrar consumo final
    const handleRegistrar = async () => {
        if (listaAlimentos.length === 0) {
            Alert.alert('Error', 'Agrega al menos un alimento a tu platillo.');
            return;
        }
        setLoading(true);
        try {
            const respuesta = await registrarConsumo({
                usuario_id: 1,
                alimentos: listaAlimentos,
                es_vegano: esVegano,
                tipo_platillo: tipoPlatillo,
            });
            Alert.alert('¡Éxito!', respuesta.mensaje, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Ups', error.response?.data?.error || 'No se pudo conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Armar Platillo</Text>

            {/* 1. Selector superior para el Patrón Factory ("Desayuno" o "Comida") */}
            <Text style={styles.sectionLabel}>1. Tipo de comida (Factory)</Text>
            <View style={styles.selectorContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, tipoPlatillo === 'desayuno' && styles.tabActivo]}
                    onPress={() => setTipoPlatillo('desayuno')}
                >
                    <Text style={[styles.tabText, tipoPlatillo === 'desayuno' && styles.tabTextActivo]}>
                        Desayuno
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, tipoPlatillo === 'comida' && styles.tabActivo]}
                    onPress={() => setTipoPlatillo('comida')}
                >
                    <Text style={[styles.tabText, tipoPlatillo === 'comida' && styles.tabTextActivo]}>
                        Comida
                    </Text>
                </TouchableOpacity>
            </View>

            {/* 2. Catálogo con Checkboxes para armar el Patrón Composite */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>2. Selecciona del Catálogo</Text>
                <TouchableOpacity onPress={cargarCatalogo}>
                    <Text style={styles.refreshText}>↻ Actualizar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.catalogoWrapper}>
                {cargandoCatalogo ? (
                    <View style={styles.catalogoLoading}>
                        <ActivityIndicator size="small" color="#4CAF50" />
                        <Text style={styles.loadingText}>Descargando ingredientes...</Text>
                    </View>
                ) : catalogo.length === 0 ? (
                    <View style={styles.catalogoLoading}>
                        <Text style={styles.emptyText}>No hay alimentos disponibles en el catálogo.</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.catalogoScroll} nestedScrollEnabled>
                        {catalogo.map((item, idx) => {
                            const estaMarcado = seleccionados.includes(item.nombre);
                            const etiquetaGrupo = item.grupo || item.tipo_factory;
                            return (
                                <TouchableOpacity
                                    key={item.id ?? `${item.nombre}-${idx}`}
                                    style={[
                                        styles.checkboxRow,
                                        estaMarcado && styles.checkboxRowSelected,
                                    ]}
                                    onPress={() => toggleSeleccion(item.nombre)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.checkboxBox, estaMarcado && styles.checkboxBoxChecked]}>
                                        {estaMarcado && <Text style={styles.checkboxTick}>✓</Text>}
                                    </View>
                                    <View style={styles.checkboxInfo}>
                                        <Text style={[styles.checkboxTitle, estaMarcado && styles.checkboxTitleSelected]}>
                                            {item.nombre}
                                        </Text>
                                        {(etiquetaGrupo || item.calorias !== undefined) && (
                                            <Text style={styles.checkboxMeta}>
                                                {etiquetaGrupo ? `${etiquetaGrupo}` : ''}
                                                {etiquetaGrupo && item.calorias !== undefined ? ' • ' : ''}
                                                {item.calorias !== undefined ? `${item.calorias} kcal` : ''}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </View>

            <TouchableOpacity
                style={[
                    styles.addSelectedButton,
                    seleccionados.length === 0 && styles.addSelectedButtonDisabled,
                ]}
                onPress={agregarSeleccionadosAlPlatillo}
            >
                <Text style={styles.addSelectedButtonText}>
                    + Añadir Seleccionados al Platillo {seleccionados.length > 0 ? `(${seleccionados.length})` : ''}
                </Text>
            </TouchableOpacity>

            {/* Desplegable para Crear Alimento Personalizado */}
            <TouchableOpacity
                onPress={() => setMostrarCreador(!mostrarCreador)}
                style={styles.toggleCreadorBtn}
            >
                <Text style={styles.linkText}>
                    {mostrarCreador ? '▲ Ocultar creador de alimentos' : '¿No está en el catálogo? Créalo aquí'}
                </Text>
            </TouchableOpacity>

            {mostrarCreador && (
                <View style={styles.creadorContainer}>
                    <Text style={styles.creadorTitle}>Nuevo Alimento Personalizado</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del nuevo alimento (ej. Manzana)"
                        value={nuevoNombre}
                        onChangeText={setNuevoNombre}
                    />
                    <View style={styles.selectorContainer}>
                        {(['Proteina', 'Fruta', 'Verdura'] as const).map((grupo) => (
                            <TouchableOpacity
                                key={grupo}
                                style={[styles.tabButton, nuevoGrupo === grupo && styles.tabActivo]}
                                onPress={() => setNuevoGrupo(grupo)}
                            >
                                <Text style={[styles.tabText, nuevoGrupo === grupo && styles.tabTextActivo]}>
                                    {grupo}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.crearButton}
                        onPress={handleCrearPersonalizado}
                        disabled={creandoAlimento}
                    >
                        {creandoAlimento ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.crearButtonText}>Guardar Ingrediente</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Lista Final del Platillo (Patrón Composite) */}
            <Text style={styles.sectionLabel}>
                3. Ingredientes en tu Platillo ({listaAlimentos.length})
            </Text>
            <View style={styles.listaContainer}>
                {listaAlimentos.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.ingredienteItem}>
                        <Text style={styles.ingredienteText}>• {item}</Text>
                        <TouchableOpacity
                            onPress={() => eliminarIngrediente(index)}
                            style={styles.deleteBtn}
                        >
                            <Text style={styles.deleteText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                {listaAlimentos.length === 0 && (
                    <Text style={styles.emptyText}>
                        Tu platillo está vacío. Marca ingredientes arriba y pulsa "+ Añadir Seleccionados".
                    </Text>
                )}
            </View>

            {/* 4. Switch para el Patrón Decorator ("¿Versión Vegana?") */}
            <View style={styles.switchContainer}>
                <View>
                    <Text style={styles.switchLabel}>¿Versión Vegana?</Text>
                    <Text style={styles.switchSubLabel}>Aplica VeganoDecorator al platillo</Text>
                </View>
                <Switch
                    value={esVegano}
                    onValueChange={setEsVegano}
                    trackColor={{ false: '#ccc', true: '#4CAF50' }}
                    thumbColor="#fff"
                />
            </View>

            {/* Botón final Registrar Consumo */}
            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegistrar}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Registrar Consumo</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7f6',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 45,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 18,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#555',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    refreshText: {
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '600',
        marginBottom: 8,
    },
    selectorContainer: {
        flexDirection: 'row',
        backgroundColor: '#e2e6e4',
        borderRadius: 10,
        padding: 4,
        marginBottom: 18,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabActivo: {
        backgroundColor: '#fff',
        elevation: 2,
    },
    tabText: {
        color: '#666',
        fontWeight: 'bold',
    },
    tabTextActivo: {
        color: '#4CAF50',
    },
    catalogoWrapper: {
        height: 180,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dce3df',
        marginBottom: 12,
        overflow: 'hidden',
    },
    catalogoScroll: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    catalogoLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginVertical: 3,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    checkboxRowSelected: {
        backgroundColor: '#e8f5e9',
        borderBottomColor: '#c8e6c9',
    },
    checkboxBox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#9e9e9e',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxBoxChecked: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
    },
    checkboxTick: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    checkboxInfo: {
        flex: 1,
    },
    checkboxTitle: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    checkboxTitleSelected: {
        color: '#1b5e20',
        fontWeight: '700',
    },
    checkboxMeta: {
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
    addSelectedButton: {
        backgroundColor: '#2e7d32',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    addSelectedButtonDisabled: {
        backgroundColor: '#9ccc9c',
    },
    addSelectedButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    toggleCreadorBtn: {
        marginBottom: 14,
        alignSelf: 'flex-end',
    },
    linkText: {
        color: '#4CAF50',
        textDecorationLine: 'underline',
        fontWeight: 'bold',
        fontSize: 14,
    },
    creadorContainer: {
        backgroundColor: '#e8f5e9',
        padding: 15,
        borderRadius: 12,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: '#a5d6a7',
    },
    creadorTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1b5e20',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12,
        borderRadius: 10,
        fontSize: 15,
        marginBottom: 12,
    },
    crearButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    crearButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    listaContainer: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dce3df',
        marginBottom: 18,
        minHeight: 90,
    },
    ingredienteItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    ingredienteText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    deleteBtn: {
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    deleteText: {
        color: '#e53935',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyText: {
        color: '#888',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 18,
        fontSize: 14,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#dce3df',
        marginBottom: 22,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    switchSubLabel: {
        fontSize: 12,
        color: '#777',
        marginTop: 2,
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#a5d6a7',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
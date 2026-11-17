import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { registrarConsumo, crearAlimentoPersonalizado } from '../services/api';

export default function RegistroScreen() {
    const [ingredienteActual, setIngredienteActual] = useState('');
    const [listaAlimentos, setListaAlimentos] = useState<string[]>([]);
    const [esVegano, setEsVegano] = useState(false);
    const [tipoPlatillo, setTipoPlatillo] = useState<'desayuno' | 'comida'>('comida');
    const [loading, setLoading] = useState(false);

    // --- Estados para el nuevo Creador de Alimentos ---
    const [mostrarCreador, setMostrarCreador] = useState(false);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevoGrupo, setNuevoGrupo] = useState<'Proteina' | 'Fruta' | 'Verdura'>('Proteina');
    const [creandoAlimento, setCreandoAlimento] = useState(false);

    const router = useRouter();

    // Funciones del Composite
    const agregarIngrediente = () => {
        if (ingredienteActual.trim().length < 2) return;
        setListaAlimentos([...listaAlimentos, ingredienteActual.trim()]);
        setIngredienteActual('');
    };

    const eliminarIngrediente = (index: number) => {
        const nuevaLista = [...listaAlimentos];
        nuevaLista.splice(index, 1);
        setListaAlimentos(nuevaLista);
    };

    // Función para guardar alimento en el catálogo de BD
    const handleCrearPersonalizado = async () => {
        if (nuevoNombre.trim().length < 2) {
            Alert.alert('Error', 'Ingresa un nombre válido');
            return;
        }
        setCreandoAlimento(true);
        try {
            await crearAlimentoPersonalizado(nuevoNombre.trim(), nuevoGrupo);
            Alert.alert('¡Catálogo Actualizado!', `Agregamos ${nuevoNombre} como ${nuevoGrupo}.`);

            // Lo agregamos automáticamente a nuestro platillo actual
            setListaAlimentos([...listaAlimentos, nuevoNombre.trim()]);

            // Limpiamos y ocultamos
            setNuevoNombre('');
            setMostrarCreador(false);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'No se pudo crear el alimento');
        } finally {
            setCreandoAlimento(false);
        }
    };

    const handleRegistrar = async () => {
        if (listaAlimentos.length === 0) {
            Alert.alert('Error', 'Agrega al menos un alimento.');
            return;
        }
        setLoading(true);
        try {
            const respuesta = await registrarConsumo({
                usuario_id: 1, // Mantenemos el ID temporal de prueba
                alimentos: listaAlimentos,
                es_vegano: esVegano,
                tipo_platillo: tipoPlatillo
            });
            Alert.alert('¡Éxito!', respuesta.mensaje, [{ text: 'OK', onPress: () => router.back() }]);
        } catch (error: any) {
            Alert.alert('Ups', error.response?.data?.error || 'Error de servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Armar Platillo</Text>

            {/* 1. Selector para el Factory */}
            <View style={styles.selectorContainer}>
                <TouchableOpacity style={[styles.tabButton, tipoPlatillo === 'desayuno' && styles.tabActivo]} onPress={() => setTipoPlatillo('desayuno')}>
                    <Text style={[styles.tabText, tipoPlatillo === 'desayuno' && styles.tabTextActivo]}>Desayuno</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, tipoPlatillo === 'comida' && styles.tabActivo]} onPress={() => setTipoPlatillo('comida')}>
                    <Text style={[styles.tabText, tipoPlatillo === 'comida' && styles.tabTextActivo]}>Comida</Text>
                </TouchableOpacity>
            </View>

            {/* 2. Constructor del Composite */}
            <View style={styles.inputGroup}>
                <TextInput
                    style={styles.input}
                    placeholder="Ingrediente (ej. Manzana)"
                    value={ingredienteActual}
                    onChangeText={setIngredienteActual}
                    onSubmitEditing={agregarIngrediente}
                />
                <TouchableOpacity style={styles.addButton} onPress={agregarIngrediente}>
                    <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            {/* --- NUEVO: Botón para mostrar creador de alimentos --- */}
            <TouchableOpacity onPress={() => setMostrarCreador(!mostrarCreador)} style={{ marginBottom: 10 }}>
                <Text style={styles.linkText}>¿No está en el catálogo? Créalo aquí</Text>
            </TouchableOpacity>

            {mostrarCreador && (
                <View style={styles.creadorContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del nuevo alimento"
                        value={nuevoNombre}
                        onChangeText={setNuevoNombre}
                    />
                    <View style={styles.selectorContainer}>
                        {['Proteina', 'Fruta', 'Verdura'].map(grupo => (
                            <TouchableOpacity
                                key={grupo}
                                style={[styles.tabButton, nuevoGrupo === grupo && styles.tabActivo]}
                                onPress={() => setNuevoGrupo(grupo as any)}
                            >
                                <Text style={[styles.tabText, nuevoGrupo === grupo && styles.tabTextActivo]}>{grupo}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TouchableOpacity style={styles.crearButton} onPress={handleCrearPersonalizado} disabled={creandoAlimento}>
                        {creandoAlimento ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar Ingrediente</Text>}
                    </TouchableOpacity>
                </View>
            )}

            {/* Lista del Platillo */}
            <View style={styles.listaContainer}>
                {listaAlimentos.map((item, index) => (
                    <View key={index} style={styles.ingredienteItem}>
                        <Text style={styles.ingredienteText}>• {item}</Text>
                        <TouchableOpacity onPress={() => eliminarIngrediente(index)}>
                            <Text style={styles.deleteText}>X</Text>
                        </TouchableOpacity>
                    </View>
                ))}
                {listaAlimentos.length === 0 && <Text style={styles.emptyText}>Platillo vacío.</Text>}
            </View>

            {/* 3. Decorator (Vegano) */}
            <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>¿Versión Vegana?</Text>
                <Switch value={esVegano} onValueChange={setEsVegano} trackColor={{ false: "#ccc", true: "#4CAF50" }} thumbColor="#fff" />
            </View>

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegistrar} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrar Consumo</Text>}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    // ... (Tus estilos anteriores se mantienen intactos, solo añade estos dos nuevos) ...
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    selectorContainer: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 10, padding: 4, marginBottom: 20 },
    tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabActivo: { backgroundColor: '#fff', elevation: 2 },
    tabText: { color: '#666', fontWeight: 'bold' },
    tabTextActivo: { color: '#4CAF50' },
    inputGroup: { flexDirection: 'row', marginBottom: 15 },
    input: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, marginRight: 10 },
    addButton: { backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', width: 55, borderRadius: 10 },
    addButtonText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    listaContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, minHeight: 100 },
    ingredienteItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
    ingredienteText: { fontSize: 16, color: '#333' },
    deleteText: { color: '#F44336', fontWeight: 'bold', fontSize: 16, paddingHorizontal: 10 },
    emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
    switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 25 },
    switchLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
    buttonDisabled: { backgroundColor: '#a5d6a7' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // NUEVOS ESTILOS
    linkText: { color: '#4CAF50', textDecorationLine: 'underline', textAlign: 'right', fontWeight: 'bold' },
    creadorContainer: { backgroundColor: '#e3f2fd', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#bbfbe3ff' },
    crearButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, alignItems: 'center' }
});
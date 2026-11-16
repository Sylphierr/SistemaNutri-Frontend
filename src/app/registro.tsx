import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { registrarConsumo } from '../services/api';

export default function RegistroScreen() {
    const [alimento, setAlimento] = useState('');
    const [esVegano, setEsVegano] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const USUARIO_ID = 1;

    const handleRegistrar = async () => {
        const listaAlimentos = alimento
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length >= 2);

        if (listaAlimentos.length === 0) {
            Alert.alert('Error', 'Ingresa al menos un alimento válido (mínimo 2 letras)');
            return;
        }

        setLoading(true);
        try {
            const respuesta = await registrarConsumo({
                usuario_id: USUARIO_ID,
                alimentos: listaAlimentos,
                es_vegano: esVegano,
            });

            Alert.alert('¡Éxito!', respuesta.mensaje, [
                { text: 'OK', onPress: () => router.back() } // Regresa al Dashboard automáticamente
            ]);
        } catch (error: any) {
            const mensajeError = error.response?.data?.error || 'No se pudo conectar con el servidor';
            Alert.alert('Ups', mensajeError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Registrar Comida</Text>
            <Text style={styles.subtitle}>
                ¿Qué comiste hoy? (Separa con comas para armar un platillo)
            </Text>

            <TextInput
                style={styles.input}
                placeholder="Ej. Pechuga de Pollo (100g), Plátano"
                value={alimento}
                onChangeText={setAlimento}
                autoCapitalize="none"
            />

            <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>¿Preparación Vegana? (Decorator)</Text>
                <Switch
                    value={esVegano}
                    onValueChange={setEsVegano}
                    trackColor={{ false: '#ccc', true: '#a5d6a7' }}
                    thumbColor={esVegano ? '#4CAF50' : '#f4f3f4'}
                />
            </View>

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegistrar}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrar Consumo</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    subtitle: { fontSize: 16, color: '#666', marginBottom: 25 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 15 },
    switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 5 },
    switchLabel: { fontSize: 16, color: '#333' },
    button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
    buttonDisabled: { backgroundColor: '#a5d6a7' },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
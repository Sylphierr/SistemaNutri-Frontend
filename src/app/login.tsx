import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../services/api'; // La función que tu IDE ya generó

export default function LoginScreen() {
    const [nombre, setNombre] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        // 1. Validación básica en el frontend
        if (!nombre.trim() || !password.trim()) {
            setErrorMsg('Por favor ingresa tu usuario y contraseña.');
            return;
        }

        setLoading(true);
        setErrorMsg(''); // Limpiamos errores previos

        try {
            // 2. Llamada a Flask (la API guardará el token en AsyncStorage automáticamente)
            await login(nombre.trim(), password);

            // 3. Redirección al Dashboard. Usamos "replace" para que el usuario 
            // no pueda usar el botón "Atrás" de Android para volver al login.
            router.replace('/');
        } catch (error: any) {
            // Manejo de credenciales incorrectas o servidor caído
            if (error.response?.status === 401) {
                setErrorMsg('Usuario o contraseña incorrectos.');
            } else {
                setErrorMsg('No se pudo conectar con el servidor.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.card}>
                {/* Título o Logo de la App */}
                <Text style={styles.appTitle}>SISTEMA NUTRI</Text>
                <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

                {/* Mensaje de Error */}
                {errorMsg !== '' && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                )}

                {/* Input de Usuario */}
                <Text style={styles.label}>Usuario</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Armando"
                    value={nombre}
                    onChangeText={setNombre}
                    autoCapitalize="none"
                />

                {/* Input de Contraseña */}
                <Text style={styles.label}>Contraseña</Text>
                <TextInput
                    style={styles.input}
                    placeholder="********"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true} // Oculta el texto
                />

                {/* Botón de Ingreso */}
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Entrar al Sistema</Text>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        padding: 20
    },
    card: {
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 15,
        elevation: 5, // Sombra en Android
        shadowColor: '#000', // Sombra en iOS
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
    },
    appTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#4CAF50',
        textAlign: 'center',
        marginBottom: 5
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30
    },
    errorContainer: {
        backgroundColor: '#ffebee',
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ffcdd2'
    },
    errorText: {
        color: '#d32f2f',
        textAlign: 'center',
        fontSize: 14
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
        marginBottom: 20
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10
    },
    buttonDisabled: {
        backgroundColor: '#a5d6a7'
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold'
    }
});
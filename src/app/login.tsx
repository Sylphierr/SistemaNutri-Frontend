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
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login, registrarUsuario, RolUsuario } from '../services/api';

export default function LoginScreen() {
    const [modoRegistro, setModoRegistro] = useState(false);
    const [nombre, setNombre] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [edad, setEdad] = useState('');
    const [pesoKg, setPesoKg] = useState('');
    const [alturaCm, setAlturaCm] = useState('');
    const [telefono, setTelefono] = useState('');
    const [preferencias, setPreferencias] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const router = useRouter();

    const redirigirPorRol = (rol?: RolUsuario) => {
        if (rol === 'admin') {
            router.replace('/admin' as any);
        } else if (rol === 'doctor') {
            router.replace('/doctor' as any);
        } else {
            router.replace('/');
        }
    };

    const handleSubmit = async () => {
        if (!nombre.trim() || !password.trim()) {
            setErrorMsg('Por favor ingresa tu usuario y contraseña.');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            if (modoRegistro) {
                const res = await registrarUsuario({
                    nombre: nombre.trim(),
                    password,
                    email: email.trim() || undefined,
                    edad: edad ? parseInt(edad, 10) : undefined,
                    peso_kg: pesoKg ? parseFloat(pesoKg) : undefined,
                    altura_cm: alturaCm ? parseFloat(alturaCm) : undefined,
                    telefono: telefono.trim() || undefined,
                    preferencias: preferencias.trim() || undefined,
                });
                redirigirPorRol(res.rol);
            } else {
                const res = await login(nombre.trim(), password);
                redirigirPorRol(res.rol);
            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                setErrorMsg('Usuario o contraseña incorrectos.');
            } else if (error.response?.data?.error) {
                setErrorMsg(error.response.data.error);
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
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.appTitle}>SISTEMA NUTRI</Text>
                    <Text style={styles.subtitle}>
                        {modoRegistro ? 'Crea tu cuenta de paciente' : 'Inicia sesión para continuar'}
                    </Text>

                    {errorMsg !== '' && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    )}

                    <Text style={styles.label}>Usuario</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Armando"
                        value={nombre}
                        onChangeText={setNombre}
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="********"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                    />

                    {modoRegistro && (
                        <>
                            <Text style={styles.label}>Correo electrónico</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="correo@ejemplo.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Edad</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="22"
                                        value={edad}
                                        onChangeText={setEdad}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Peso (kg)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="70"
                                        value={pesoKg}
                                        onChangeText={setPesoKg}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Altura (cm)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="175"
                                        value={alturaCm}
                                        onChangeText={setAlturaCm}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.label}>Teléfono</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="555-123-4567"
                                        value={telefono}
                                        onChangeText={setTelefono}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>Preferencias / Objetivos</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej. Dieta alta en proteína"
                                value={preferencias}
                                onChangeText={setPreferencias}
                            />
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {modoRegistro ? 'Registrarse' : 'Entrar al Sistema'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.switchBtn}
                        onPress={() => {
                            setModoRegistro(!modoRegistro);
                            setErrorMsg('');
                        }}
                    >
                        <Text style={styles.switchText}>
                            {modoRegistro
                                ? '¿Ya tienes cuenta? Inicia sesión'
                                : '¿Eres nuevo? Regístrate como usuario'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        padding: 25,
        borderRadius: 15,
        elevation: 5,
        shadowColor: '#000',
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
        marginBottom: 24
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
        fontSize: 13,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        borderRadius: 10,
        fontSize: 15,
        marginBottom: 14
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    halfInput: {
        flex: 1,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 6
    },
    buttonDisabled: {
        backgroundColor: '#a5d6a7'
    },
    buttonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold'
    },
    switchBtn: {
        marginTop: 16,
        alignItems: 'center',
    },
    switchText: {
        color: '#2e7d32',
        fontSize: 14,
        fontWeight: '600',
    },
});

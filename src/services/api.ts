import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Reemplaza esta IP con tu IPv4 local real (ej. 192.168.1.X)
// Flask debe estar corriendo con: flask run --host=0.0.0.0
const API_URL = 'http://192.168.100.158:5000/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor de peticiones: inyecta el token JWT si existe en AsyncStorage
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = 'Bearer ' + token;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor de respuestas: limpia el token y redirige al login ante un 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem('userToken');
            try {
                router.replace('/login' as any);
            } catch {
                // Ignorar si la ruta /login aún no está montada
            }
        }
        return Promise.reject(error);
    }
);

export interface IngredientePorcion {
    nombre: string;
    gramos: number;
}

// Autenticación JWT
export const login = async (nombre: string, password: string) => {
    const response = await api.post('/auth/login', { nombre, password });
    if (response.data?.access_token) {
        await AsyncStorage.setItem('userToken', response.data.access_token);
    }
    return response.data;
};

// Funciones para consumir tus Endpoints (el usuario se obtiene del token JWT)
export const registrarConsumo = async (data: {
    alimentos: (IngredientePorcion | string)[];
    tipo_platillo?: 'desayuno' | 'comida' | 'cena' | 'merienda';
    es_vegano?: boolean;
}) => {
    const response = await api.post('/consumo/registrar', data);
    return response.data;
};

export const obtenerReporte = async (
    tipo: 'calorias' | 'macros' | 'azucar_sodio' = 'calorias'
) => {
    const response = await api.get('/consumo/reporte', {
        params: { tipo }
    });
    return response.data;
};

export const crearAlimentoPersonalizado = async (nombre: string, grupo: string) => {
    const response = await api.post('/consumo/alimento/personalizado', { nombre, grupo });
    return response.data;
};

export const obtenerCatalogoAlimentos = async () => {
    const response = await api.get('/consumo/alimentos');
    return response.data;
};

export const actualizarObjetivo = async (
    calorias_meta: number,
    proteina_meta: number
) => {
    const response = await api.put('/consumo/objetivo', {
        calorias_meta,
        proteina_meta,
    });
    return response.data;
};
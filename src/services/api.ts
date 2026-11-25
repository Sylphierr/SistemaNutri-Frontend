import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Reemplaza esta IP con tu IPv4 local real (ej. 192.168.1.X)
// Flask debe estar corriendo con: flask run --host=0.0.0.0
const API_URL = 'http://172.16.7.20:5000/api';

export type RolUsuario = 'usuario' | 'doctor' | 'admin';

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
            await AsyncStorage.multiRemove(['userToken', 'userRole', 'userName']);
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

export interface PerfilUsuario {
    id: number;
    nombre: string;
    rol: RolUsuario;
    preferencias: string;
    email: string;
    edad: number | null;
    peso_kg: number | null;
    altura_cm: number | null;
    telefono: string;
}

export interface SolicitudAyuda {
    id: number;
    paciente_id: number;
    paciente_nombre: string;
    doctor_id: number | null;
    doctor_nombre: string | null;
    motivo: string;
    estado: 'pendiente' | 'en_atencion' | 'cerrada';
    fecha_creacion: string | null;
    fecha_actualizacion: string | null;
    total_mensajes: number;
    ultimo_mensaje: string | null;
}

export interface MensajeChat {
    id: number;
    solicitud_id: number;
    remitente_id: number;
    remitente_nombre: string;
    remitente_rol: RolUsuario;
    contenido: string;
    fecha_envio: string | null;
    leido: boolean;
}

// --- Autenticación y Perfil ---
export const login = async (nombre: string, password: string) => {
    const response = await api.post('/auth/login', { nombre, password });
    if (response.data?.access_token) {
        await AsyncStorage.setItem('userToken', response.data.access_token);
        await AsyncStorage.setItem('userRole', response.data.rol || 'usuario');
        await AsyncStorage.setItem('userName', response.data.usuario || nombre);
    }
    return response.data;
};

export const registrarUsuario = async (data: {
    nombre: string;
    password: string;
    email?: string;
    edad?: number;
    peso_kg?: number;
    altura_cm?: number;
    telefono?: string;
    preferencias?: string;
}) => {
    const response = await api.post('/auth/register', data);
    if (response.data?.access_token) {
        await AsyncStorage.setItem('userToken', response.data.access_token);
        await AsyncStorage.setItem('userRole', response.data.rol || 'usuario');
        await AsyncStorage.setItem('userName', response.data.usuario || data.nombre);
    }
    return response.data;
};

export const logout = async () => {
    await AsyncStorage.multiRemove(['userToken', 'userRole', 'userName']);
};

export const obtenerPerfil = async (): Promise<PerfilUsuario> => {
    const response = await api.get('/auth/me');
    return response.data;
};

export const actualizarPerfil = async (data: Partial<PerfilUsuario>) => {
    const response = await api.put('/auth/perfil', data);
    return response.data;
};

// --- Endpoints de Consumo (Usuario) ---
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

// --- Endpoints de Ayuda Médica y Chat ---
export const listarDoctores = async (): Promise<PerfilUsuario[]> => {
    const response = await api.get('/ayuda/doctores');
    return response.data;
};

export const crearSolicitudAyuda = async (motivo: string, doctor_id?: number | null) => {
    const response = await api.post('/ayuda/solicitudes', {
        motivo,
        doctor_id: doctor_id ?? null,
    });
    return response.data;
};

export const listarSolicitudes = async (): Promise<SolicitudAyuda[]> => {
    const response = await api.get('/ayuda/solicitudes');
    return response.data;
};

export const obtenerMensajesChat = async (solicitud_id: number): Promise<{
    solicitud: SolicitudAyuda;
    mensajes: MensajeChat[];
}> => {
    const response = await api.get(`/ayuda/solicitudes/${solicitud_id}/mensajes`);
    return response.data;
};

export const enviarMensajeChat = async (solicitud_id: number, contenido: string) => {
    const response = await api.post(`/ayuda/solicitudes/${solicitud_id}/mensajes`, { contenido });
    return response.data;
};

export const cambiarEstadoSolicitud = async (
    solicitud_id: number,
    estado: 'pendiente' | 'en_atencion' | 'cerrada'
) => {
    const response = await api.put(`/ayuda/solicitudes/${solicitud_id}/estado`, { estado });
    return response.data;
};

// --- Endpoints del Rol Doctor ---
export const listarPacientesDoctor = async () => {
    const response = await api.get('/doctor/pacientes');
    return response.data;
};

export const obtenerDetallePacienteDoctor = async (
    paciente_id: number,
    tipo: 'calorias' | 'macros' | 'azucar_sodio' = 'calorias'
) => {
    const response = await api.get(`/doctor/pacientes/${paciente_id}`, { params: { tipo } });
    return response.data;
};

export const atenderSolicitudDoctor = async (solicitud_id: number) => {
    const response = await api.post(`/doctor/solicitudes/${solicitud_id}/atender`);
    return response.data;
};

// --- Endpoints del Rol Administrador ---
export const obtenerResumenGlobalAdmin = async () => {
    const response = await api.get('/admin/resumen-global');
    return response.data;
};

export const listarUsuariosAdmin = async () => {
    const response = await api.get('/admin/usuarios');
    return response.data;
};

export const crearUsuarioAdmin = async (data: {
    nombre: string;
    password: string;
    rol: RolUsuario;
    email?: string;
    edad?: number;
    peso_kg?: number;
    altura_cm?: number;
    telefono?: string;
    preferencias?: string;
}) => {
    const response = await api.post('/admin/usuarios', data);
    return response.data;
};

export const cambiarRolAdmin = async (usuario_id: number, rol: RolUsuario) => {
    const response = await api.put(`/admin/usuarios/${usuario_id}/rol`, { rol });
    return response.data;
};

export const eliminarUsuarioAdmin = async (usuario_id: number) => {
    const response = await api.delete(`/admin/usuarios/${usuario_id}`);
    return response.data;
};

export const obtenerDetalleUsuarioAdmin = async (usuario_id: number) => {
    const response = await api.get(`/admin/usuarios/${usuario_id}/detalle`);
    return response.data;
};

export const listarRegistrosAdmin = async () => {
    const response = await api.get('/admin/registros');
    return response.data;
};

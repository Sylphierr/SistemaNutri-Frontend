import axios from 'axios';

// Reemplaza esta IP con tu IPv4 local real (ej. 192.168.1.X)
// Flask debe estar corriendo con: flask run --host=0.0.0.0
const API_URL = 'http://192.168.100.158:5000/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Funciones para consumir tus Endpoints
export const registrarConsumo = async (data: {
    usuario_id: number;
    alimentos: string[];
    tipo_platillo?: 'desayuno' | 'comida';
    es_vegano?: boolean;
}) => {
    const response = await api.post('/consumo/registrar', data);
    return response.data;
};

export const obtenerReporte = async (
    usuarioId: number,
    tipo: 'calorias' | 'macros' | 'azucar_sodio' = 'calorias'
) => {
    const response = await api.get(`/consumo/usuario/${usuarioId}/reporte`, {
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
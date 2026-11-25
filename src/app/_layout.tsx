import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#4CAF50' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Iniciar Sesión', headerShown: false }} />
      <Stack.Screen name="index" options={{ title: 'KEEP IT HEALTHY' }} />
      <Stack.Screen name="registro" options={{ title: 'Nuevo Registro' }} />
      <Stack.Screen name="ayuda" options={{ title: 'Contacto con Doctor' }} />
      <Stack.Screen name="doctor" options={{ title: 'Panel Médico' }} />
      <Stack.Screen name="admin" options={{ title: 'Administración' }} />
    </Stack>
  );
}

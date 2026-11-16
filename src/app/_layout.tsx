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
      {/* index hace referencia a index.tsx */}
      <Stack.Screen name="index" options={{ title: 'SISTEMA NUTRI' }} />

      {/* registro hará referencia a registro.tsx (que crearemos en el siguiente paso) */}
      <Stack.Screen name="registro" options={{ title: 'Nuevo Registro' }} />
    </Stack>
  );
}

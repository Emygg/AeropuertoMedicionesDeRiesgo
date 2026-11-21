import { useState, useEffect } from 'react';
import { LayoutDashboard, LineChart as ChartIcon, Wind, Droplets, Thermometer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardClima() {
  const [clima, setClima] = useState({ temperatura: 0, humedad: 0, viento: 0 });
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState(false);
  
  // Estado para el menú lateral ('monitor' o 'graficas')
  const [vistaActiva, setVistaActiva] = useState('monitor');
  const [mostrarTodo, setMostrarTodo] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const [resActual, resHistorial] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/clima/actual'),
          fetch('http://127.0.0.1:8000/api/clima/historial')
        ]);
        
        const dataActual = await resActual.json();
        const dataHistorial = await resHistorial.json();
        
        setClima(dataActual);
        // Invertimos el historial para que la gráfica fluya de izquierda (viejo) a derecha (nuevo)
        setHistorial(dataHistorial.reverse());
        setError(false);
      } catch (err) {
        console.error("Error conectando a FastAPI", err);
        setError(true);
      }
    };

    const intervalo = setInterval(fetchDatos, 1000);
    return () => clearInterval(intervalo);
  }, []);

const obtenerEstadoVuelo = (viento, temp, humedad) => {
  // ESTADO 3: PELIGRO (ROJO)
  if (viento >= 60 || humedad >= 85 || temp >= 45) {
    let motivo = 'Ráfagas críticas (≥ 60 nudos).';
    if (humedad >= 85) motivo = 'Humedad crítica (≥ 85%): riesgo de condensación en electrónica y lluvia.';
    else if (temp >= 45) motivo = 'Temperatura extrema (≥ 45°C): riesgo de sobrecalentamiento de batería.';

    return {
      color: 'bg-red-600 text-white',
      titulo: 'Peligro: No Despegar',
      condicion: motivo,
      decision: 'DECISIÓN: Cancelar despegue y esperar nuevas instrucciones de vuelo'
    };
  }

  // ESTADO 2: PRECAUCIÓN (AMARILLO)
  if (viento >= 35 || humedad >= 70 || temp >= 35) {
    let motivo = 'Viento moderado (35–59 nudos).';
    if (humedad >= 70) motivo = 'Humedad elevada (70–84%): posible neblina, nubes densas o empañamiento de cristales';
    else if (temp >= 35) motivo = 'Temperatura alta (35–44°C): provabilidad de calentamiento';

    return {
      color: 'bg-yellow-500 text-gray-950',
      titulo: 'Precaución: Vuelo Restringido',
      condicion: motivo,
      decision: 'DECISIÓN: Limitar altitud, activar modo de despegue seguro y revisar motores'
    };
  }

  // ESTADO 1: SEGURO (VERDE)
  return {
    color: 'bg-green-600 text-white',
    titulo: 'Despegue Seguro',
    condicion: 'Viento, temperatura y humedad en rangos óptimos.',
    decision: 'DECISIÓN: Autorizar despegue y ejecutar plan de vuelo normal.'
  };
};

const estado = obtenerEstadoVuelo(clima.viento, clima.temperatura, clima.humedad);
  
  // Preparamos los datos para la gráfica formateando la hora
  const datosGrafica = historial.map(reg => ({
    ...reg,
    horaFormateada: new Date(reg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }));

  // ================= VISTAS ================= //

  const VistaMonitor = () => (
    <div className="max-w-5xl mx-auto animation-fade-in">
      {/* Semáforo */}
      <div className={`p-6 rounded-2xl mb-8 text-center transition-colors duration-500 shadow-lg ${estado.color}`}>
        <h2 className="text-4xl font-black uppercase tracking-wider">
          {estado.titulo}
        </h2>
        <p className="mt-2 text-lg font-medium opacity-90">
          {estado.condicion}
        </p>
        <p className="mt-3 text-sm font-bold uppercase tracking-wide bg-black/20 inline-block px-4 py-2 rounded-lg">
          {estado.decision}
        </p>
      </div>
      
      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-gray-400 mb-1 uppercase text-xs font-bold tracking-widest">Viento</h3>
            <p className="text-4xl font-black">{clima.viento.toFixed(1)} <span className="text-xl text-gray-500 font-normal">kts</span></p>
          </div>
          <Wind className="w-12 h-12 text-blue-400 opacity-50" />
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-gray-400 mb-1 uppercase text-xs font-bold tracking-widest">Temperatura</h3>
            <p className="text-4xl font-black">{clima.temperatura.toFixed(1)} <span className="text-xl text-gray-500 font-normal">°C</span></p>
          </div>
          <Thermometer className="w-12 h-12 text-red-400 opacity-50" />
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-gray-400 mb-1 uppercase text-xs font-bold tracking-widest">Humedad</h3>
            <p className="text-4xl font-black">{clima.humedad.toFixed(1)} <span className="text-xl text-gray-500 font-normal">%</span></p>
          </div>
          <Droplets className="w-12 h-12 text-cyan-400 opacity-50" />
        </div>
      </div>

      {/* Tabla (Invertimos de nuevo para que lo más reciente salga arriba) */}
      <h3 className="text-xl font-bold mb-4 flex items-center"><LayoutDashboard className="mr-2" /> Historial Reciente</h3>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-700 text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Hora</th>
              <th className="px-6 py-4 font-semibold">Temperatura</th>
              <th className="px-6 py-4 font-semibold">Humedad</th>
              <th className="px-6 py-4 font-semibold">Viento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {[...datosGrafica].reverse().slice(0, mostrarTodo ? datosGrafica.length : 10).map((registro, idx) => (
              <tr key={idx} className="hover:bg-gray-750 transition-colors">
                <td className="px-6 py-3">{registro.horaFormateada}</td>
                <td className="px-6 py-3">{registro.temperatura.toFixed(1)} °C</td>
                <td className="px-6 py-3">{registro.humedad.toFixed(1)} %</td>
                <td className="px-6 py-3">{registro.viento.toFixed(1)} nts</td>
              </tr>
            ))}
          </tbody>
        </table>
        {datosGrafica.length > 10 && (
          <button onClick={() => setMostrarTodo(!mostrarTodo)} className="w-full bg-gray-800 hover:bg-gray-700 text-blue-400 py-3 text-sm font-bold transition-colors">
            {mostrarTodo ? 'Ocultar registros' : `Ver todos (${datosGrafica.length})`}
          </button>
        )}
      </div>
    </div>
  );

  const VistaGraficas = () => (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6 flex items-center"><ChartIcon className="mr-3 text-blue-500"/> Análisis de Tendencias</h2>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex-1 min-h-[500px]">
        {datosGrafica.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">Esperando datos para graficar...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datosGrafica}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="horaFormateada" stroke="#9CA3AF" tick={{fontSize: 12}} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
              <Line type="monotone" dataKey="viento" name="Viento (nudos)" stroke="#3B82F6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="temperatura" name="Temperatura (°C)" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="humedad" name="Humedad (%)" stroke="#06B6D4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
      
      {/* Menú Lateral (Sidebar) */}
      <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
            AERO<br/>MONITOR IoT
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setVistaActiva('monitor')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all ${
              vistaActiva === 'monitor' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Panel Principal
          </button>
          
          <button 
            onClick={() => setVistaActiva('graficas')}
            className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-all ${
              vistaActiva === 'graficas' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <ChartIcon className="w-5 h-5 mr-3" />
            Gráficas
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full mr-2 ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></div>
            {error ? 'Desconectado de API' : 'Sistema en línea'}
          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 overflow-y-auto p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg flex items-center">
            ⚠️ Conexión perdida con el backend FastAPI. Revisando servidor...
          </div>
        )}
        
        {vistaActiva === 'monitor' ? <VistaMonitor /> : <VistaGraficas />}
      </main>

    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, BookOpen, GraduationCap } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white min-h-[calc(100vh-80px)] font-sans">
      {/* Hero Section */}
      <section className="relative h-[650px] bg-brand-blue overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue to-brand-dark-blue opacity-95"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
          <div className="max-w-3xl space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-white text-xs font-black uppercase tracking-widest">Portal Académico Activo</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black text-white leading-[0.95] tracking-tighter">
              Potencia tu <br />
              <span className="text-blue-300">Aprendizaje</span>
            </h1>

            <p className="text-lg text-blue-100 font-medium leading-relaxed max-w-xl opacity-90">
              Conecta con los mejores estudiantes de tu facultad. Gestiona tus monitorías, certíficate y alcanza la excelencia académica.
            </p>

            <div className="flex flex-wrap gap-5 pt-8">
              <button
                onClick={() => navigate('/signup')}
                className="px-10 py-5 bg-white text-brand-blue font-black rounded-3xl shadow-2xl hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all text-xl"
              >
                Crear Mi Cuenta 🎓
              </button>

            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gray-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: 'Excelencia Académica',
                desc: 'Monitores seleccionados por su alto rendimiento y compromiso pedagógico.',
                color: 'bg-blue-50 text-brand-blue'
              },
              {
                title: 'Flexibilidad Total',
                desc: 'Modalidades presenciales en sede y virtuales adaptadas a tu ritmo de estudio.',
                color: 'bg-green-50 text-green-600'
              },
              {
                title: 'Gestión Transparente',
                desc: 'Certificados automáticos y seguimiento en tiempo real para monitores y alumnos.',
                color: 'bg-yellow-50 text-yellow-600'
              }
            ].map((item, i) => (
              <div key={i} className="bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-start gap-6 hover:shadow-xl transition-all group">
                <div className={`${item.color} w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:rotate-6 transition-transform`}>
                  0{i + 1}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-text mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { FaUsers, FaChalkboardTeacher, FaCalendarAlt, FaDollarSign, FaExclamationTriangle } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const endpoint = user.role === 'student' ? '/dashboard/student' : '/dashboard';
      const response = await api.get(endpoint);
      setDashboard(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (user.role === 'student') {
    return <StudentDashboard data={dashboard} />;
  }

  return <AdminDashboard data={dashboard} />;
}

function AdminDashboard({ data }) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FaUsers />}
          title="Total de Alunos"
          value={data?.summary?.totalStudents || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={<FaChalkboardTeacher />}
          title="Professores"
          value={data?.summary?.totalTeachers || 0}
          color="bg-green-500"
        />
        <StatCard
          icon={<FaCalendarAlt />}
          title="Turmas Ativas"
          value={data?.summary?.totalClasses || 0}
          color="bg-purple-500"
        />
        <StatCard
          icon={<FaDollarSign />}
          title="Receita do Mês"
          value={`R$ ${(data?.summary?.monthRevenue || 0).toFixed(2)}`}
          color="bg-yellow-500"
        />
      </div>

      {/* Pagamentos Atrasados */}
      {data?.summary?.overduePayments > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <FaExclamationTriangle className="text-red-500 text-2xl mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">
                {data.summary.overduePayments} Pagamento(s) Atrasado(s)
              </h3>
              <p className="text-red-600">
                Total: R$ {(data.summary.overduePaymentsAmount || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Matrículas por Instrumento */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Alunos por Instrumento</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.enrollmentsByInstrument || []}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {(data?.enrollmentsByInstrument || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Receita */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Receita dos Últimos Meses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.revenueByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#0ea5e9" name="Receita (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Próximos Eventos */}
      {data?.upcomingEvents && data.upcomingEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Próximos Eventos</h2>
          <div className="space-y-3">
            {data.upcomingEvents.map((event) => (
              <div key={event.id} className="border-l-4 border-primary-500 pl-4 py-2">
                <h3 className="font-semibold text-gray-800">{event.title}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(event.event_date).toLocaleDateString('pt-BR')} - {event.location}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inadimplentes */}
      {data?.defaulters && data.defaulters.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Alunos Inadimplentes</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Nome</th>
                  <th className="px-4 py-2 text-left">Telefone</th>
                  <th className="px-4 py-2 text-right">Parcelas</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.defaulters.map((defaulter) => (
                  <tr key={defaulter.id} className="border-b">
                    <td className="px-4 py-2">{defaulter.name}</td>
                    <td className="px-4 py-2">{defaulter.phone}</td>
                    <td className="px-4 py-2 text-right">{defaulter.overdue_count}</td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">
                      R$ {defaulter.total_debt.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StudentDashboard({ data }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Meu Painel</h1>

      {/* Estatísticas de Frequência */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Frequência do Mês</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{data?.attendance?.total_classes || 0}</div>
            <div className="text-sm text-gray-600">Total de Aulas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{data?.attendance?.present || 0}</div>
            <div className="text-sm text-gray-600">Presenças</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{data?.attendance?.absent || 0}</div>
            <div className="text-sm text-gray-600">Faltas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">
              {data?.attendance?.attendance_rate || 0}%
            </div>
            <div className="text-sm text-gray-600">Taxa de Presença</div>
          </div>
        </div>
      </div>

      {/* Minhas Turmas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Minhas Turmas</h2>
        <div className="space-y-3">
          {data?.myClasses && data.myClasses.length > 0 ? (
            data.myClasses.map((cls) => (
              <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800">{cls.name}</h3>
                <p className="text-sm text-gray-600">
                  {cls.instrument_name} - Professor(a): {cls.teacher_name}
                </p>
                <p className="text-sm text-gray-600">
                  {cls.day_of_week} às {cls.start_time}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-600">Você não está matriculado em nenhuma turma.</p>
          )}
        </div>
      </div>

      {/* Pagamentos Pendentes */}
      {data?.myPayments && data.myPayments.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Pagamentos Pendentes</h2>
          <div className="space-y-3">
            {data.myPayments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center border-b pb-3">
                <div>
                  <p className="font-semibold">
                    Referência: {new Date(payment.reference_month).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-600">
                    Vencimento: {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">R$ {payment.amount.toFixed(2)}</p>
                  {new Date(payment.due_date) < new Date() && (
                    <span className="text-xs text-red-600">Atrasado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos Eventos */}
      {data?.myEvents && data.myEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Próximos Eventos</h2>
          <div className="space-y-3">
            {data.myEvents.map((event) => (
              <div key={event.id} className="border-l-4 border-primary-500 pl-4 py-2">
                <h3 className="font-semibold text-gray-800">{event.title}</h3>
                <p className="text-sm text-gray-600">
                  {new Date(event.event_date).toLocaleDateString('pt-BR')} - {event.location}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`${color} text-white p-3 rounded-lg mr-4`}>
          <div className="text-2xl">{icon}</div>
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

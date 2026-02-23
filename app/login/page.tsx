export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Meta Ads Dashboard
        </h1>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-2">
              📋 Acesso para Clientes:
            </p>
            <p className="text-sm text-blue-700">
              Use o link com seu token de acesso:
            </p>
            <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-2 block">
              dashboard.com?token=seu_token
            </code>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              🔐 Área administrativa em desenvolvimento
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

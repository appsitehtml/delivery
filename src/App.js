import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, addDoc, 
  updateDoc, deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Minus, Trash2, LayoutDashboard, Menu as MenuIcon, 
  User, ClipboardList, DollarSign, Package, CheckCircle2, Clock, 
  Truck, X 
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE (VINCULADO AO SEU PROJETO) ---
const firebaseConfig = {
  apiKey: "AIzaSyBcAu-igV2j5LmDaHwDQmNhZBvUMj8uXmw",
  authDomain: "delivery-be23c.firebaseapp.com",
  projectId: "delivery-be23c",
  storageBucket: "delivery-be23c.firebasestorage.app",
  messagingSenderId: "545669601914",
  appId: "1:545669601914:web:47508b903dcfdc307579c3"
};

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('client'); 
  const [activeTab, setActiveTab] = useState('menu'); 
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Autenticação Silenciosa
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { console.error("Erro Auth:", e); }
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sincronização em Tempo Real com o Firestore
  useEffect(() => {
    if (!user) return;

    // Sincroniza Produtos (Coleção: produtos)
    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sincroniza Pedidos (Coleção: pedidos)
    const unsubOrders = onSnapshot(collection(db, 'pedidos'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data.sort((a, b) => b.createdAt - a.createdAt));
    });

    // Perfil (Coleção: usuarios)
    const profileRef = doc(db, 'usuarios', user.uid);
    getDoc(profileRef).then(docSnap => {
      if (docSnap.exists()) setProfile(docSnap.data());
    });

    return () => { unsubProducts(); unsubOrders(); };
  }, [user]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const placeOrder = async (method) => {
    if (!profile?.name || !profile?.address) {
      alert("⚠️ Preencha seu nome e endereço no Perfil antes de pedir.");
      setActiveTab('profile');
      return;
    }

    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const orderData = {
      userId: user.uid,
      userName: profile.name,
      address: profile.address,
      items: cart,
      total: total,
      status: 'pendente',
      paymentMethod: method,
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, 'pedidos'), orderData);
      
      if (method === 'whatsapp') {
        const msg = encodeURIComponent(`*NOVO PEDIDO (EletroNit)*\n\n*Cliente:* ${profile.name}\n*Endereço:* ${profile.address}\n\n*Itens:*\n${cart.map(i => `• ${i.quantity}x ${i.name}`).join('\n')}\n\n*Total:* R$ ${total.toFixed(2)}\n*Pagamento:* ${method.toUpperCase()}`);
        window.open(`https://wa.me/5521999999999?text=${msg}`); // ⬅️ COLOQUE SEU WHATSAPP AQUI
      }

      setCart([]);
      alert("✅ Pedido enviado com sucesso!");
      setActiveTab('menu');
    } catch (err) { 
      alert("Erro ao enviar pedido: " + err.message); 
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-sans">Iniciando Delivery...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-1.5 rounded-lg"><ShoppingBag className="text-white w-5 h-5" /></div>
          <h1 className="font-bold text-lg tracking-tight">EletroNit<span className="text-red-600">Pro</span></h1>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 scale-90">
          <button onClick={() => setView('client')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${view === 'client' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>LOJA</button>
          <button onClick={() => setView('admin')} className={`px-3 py-1 rounded-md text-xs font-bold transition ${view === 'admin' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>PAINEL</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {view === 'client' ? (
          <div className="space-y-6">
            {activeTab === 'menu' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.length === 0 && <p className="text-center text-gray-400 py-10 col-span-full">Nenhum produto disponível no momento.</p>}
                {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                    <div>
                      <h3 className="font-bold text-gray-800">{p.name}</h3>
                      <p className="text-red-600 font-black">R$ {parseFloat(p.price).toFixed(2)}</p>
                    </div>
                    <button onClick={() => addToCart(p)} className="bg-red-600 text-white p-3 rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition"><Plus size={20}/></button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cart' && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 max-w-lg mx-auto">
                <h2 className="text-xl font-black mb-6">Meu Carrinho</h2>
                {cart.length === 0 ? <div className="text-center py-10 text-gray-400">Seu carrinho está vazio.</div> : (
                  <>
                    <div className="space-y-4 mb-6">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                          <div>
                            <p className="font-bold text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.quantity} unidade(s)</p>
                          </div>
                          <span className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-2xl font-black flex justify-between border-t pt-4">
                      <span>Total:</span>
                      <span className="text-red-600">R$ {cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 mt-8">
                      <button onClick={() => placeOrder('whatsapp')} className="bg-green-500 text-white p-4 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-100">Finalizar pelo WhatsApp</button>
                      <button onClick={() => placeOrder('pix')} className="bg-gray-900 text-white p-4 rounded-2xl font-bold shadow-lg shadow-gray-200">Pagar com PIX (App)</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm max-w-md mx-auto">
                <h2 className="font-black text-xl mb-6">Meus Dados</h2>
                <div className="space-y-4">
                  <input className="w-full border border-gray-200 p-4 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Nome Completo" value={profile?.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} />
                  <textarea className="w-full border border-gray-200 p-4 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]" placeholder="Endereço de Entrega (Rua, Nº, Bairro)" value={profile?.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} />
                  <button className="w-full bg-red-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-red-100 transition hover:bg-red-700" onClick={async () => {
                    await setDoc(doc(db, 'usuarios', user.uid), profile);
                    alert("✅ Perfil atualizado!");
                    setActiveTab('menu');
                  }}>Salvar Informações</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Receita Total</p>
                  <p className="text-3xl font-black text-green-600">R$ {orders.reduce((acc, o) => acc + o.total, 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pedidos Ativos</p>
                  <p className="text-3xl font-black text-gray-800">{orders.length}</p>
                </div>
                <button onClick={() => {
                   const n = prompt("Nome do Produto:");
                   const p = prompt("Preço (ex: 29.90):");
                   if(n && p) addDoc(collection(db, 'produtos'), { name: n, price: parseFloat(p.replace(',','.')), createdAt: Date.now() });
                }} className="bg-gray-900 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2">+ Novo Produto</button>
             </div>

             <div className="space-y-3">
                <h3 className="font-black text-lg">Gerenciar Pedidos</h3>
                {orders.length === 0 && <p className="text-gray-400 text-sm italic">Nenhum pedido recebido ainda...</p>}
                {orders.map(o => (
                  <div key={o.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-gray-800">{o.userName}</p>
                      <p className="text-xs text-gray-400 mb-1">{o.address}</p>
                      <div className="flex gap-1">
                        {o.items.map((item, idx) => (
                          <span key={idx} className="bg-gray-100 text-[10px] px-2 py-0.5 rounded-full font-medium">{item.quantity}x {item.name}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="font-black text-red-600">R$ {o.total.toFixed(2)}</p>
                      <button onClick={() => { if(confirm("Apagar pedido?")) deleteDoc(doc(db, 'pedidos', o.id)) }} className="text-gray-300 hover:text-red-600 transition"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {view === 'client' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-3 flex justify-around shadow-2xl z-50">
          <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center transition ${activeTab === 'menu' ? 'text-red-600 scale-110' : 'text-gray-400'}`}><MenuIcon size={22}/><span className="text-[10px] font-bold">Cardápio</span></button>
          <button onClick={() => setActiveTab('cart')} className={`flex flex-col items-center relative transition ${activeTab === 'cart' ? 'text-red-600 scale-110' : 'text-gray-400'}`}><ShoppingBag size={22}/>{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">{cart.length}</span>}<span className="text-[10px] font-bold">Carrinho</span></button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center transition ${activeTab === 'profile' ? 'text-red-600 scale-110' : 'text-gray-400'}`}><User size={22}/><span className="text-[10px] font-bold">Perfil</span></button>
        </nav>
      )}
    </div>
  );
}

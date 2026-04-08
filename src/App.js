import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, addDoc, 
  deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Trash2, Menu, User 
} from 'lucide-react';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBcAu-igV2j5LmDaHwDQmNhZBvUMj8uXmw",
  authDomain: "delivery-be23c.firebaseapp.com",
  projectId: "delivery-be23c",
  storageBucket: "delivery-be23c.firebasestorage.app",
  messagingSenderId: "545669601914",
  appId: "1:545669601914:web:47508b903dcfdc307579c3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('client'); 
  const [activeTab, setActiveTab] = useState('menu'); 
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [profile, setProfile] = useState({ name: '', address: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        try { await signInAnonymously(auth); } catch (e) { console.error(e); }
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubP = onSnapshot(collection(db, 'produtos'), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubO = onSnapshot(collection(db, 'pedidos'), (s) => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDoc(doc(db, 'usuarios', user.uid)).then(d => d.exists() && setProfile(d.data()));
    return () => { unsubP(); unsubO(); };
  }, [user]);

  const placeOrder = async () => {
    if (!profile.name || !profile.address) return alert("Preencha o perfil!");
    const total = cart.reduce((acc, i) => acc + i.price, 0);
    await addDoc(collection(db, 'pedidos'), {
      userId: user.uid, userName: profile.name, address: profile.address,
      items: cart, total: total, createdAt: Date.now()
    });
    setCart([]);
    alert("Pedido enviado!");
    setActiveTab('menu');
  };

  if (loading) return <div className="p-10 text-center font-sans">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-lg">EletroNit <span className="text-red-600">Pro</span></h1>
        <button onClick={() => setView(view === 'client' ? 'admin' : 'client')} className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold uppercase">
          {view === 'client' ? 'Painel ADM' : 'Voltar à Loja'}
        </button>
      </header>

      <main className="max-w-md mx-auto p-4">
        {view === 'client' ? (
          <div>
            {activeTab === 'menu' && (
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-sm">
                    <div><p className="font-bold text-gray-800">{p.name}</p><p className="text-red-600 font-bold">R$ {parseFloat(p.price).toFixed(2)}</p></div>
                    <button onClick={() => setCart([...cart, p])} className="bg-red-600 text-white p-2 rounded-lg"><Plus size={20}/></button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'cart' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="font-bold mb-4 text-xl">Carrinho</h2>
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b py-2 text-sm">
                    <span>{item.name}</span><span className="font-bold">R$ {parseFloat(item.price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="mt-4 text-right font-bold text-lg">Total: R$ {cart.reduce((a, b) => a + b.price, 0).toFixed(2)}</div>
                <button onClick={placeOrder} className="w-full bg-green-600 text-white p-4 rounded-xl mt-6 font-bold shadow-lg">Finalizar Pedido</button>
              </div>
            )}
            {activeTab === 'profile' && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <h2 className="font-bold mb-4">Seus Dados</h2>
                <input className="w-full border p-3 rounded-xl mb-2" placeholder="Nome" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                <textarea className="w-full border p-3 rounded-xl mb-2" placeholder="Endereço Completo" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} />
                <button className="w-full bg-black text-white p-3 rounded-xl font-bold" onClick={async () => {
                   await setDoc(doc(db, 'usuarios', user.uid), profile);
                   alert("Perfil Salvo!");
                   setActiveTab('menu');
                }}>Salvar Dados</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => {
              const n = prompt("Nome do Produto:");
              const p = prompt("Preço (ex: 25.90):");
              if(n && p) addDoc(collection(db, 'produtos'), { name: n, price: parseFloat(p.replace(',','.')) });
            }} className="w-full bg-red-600 text-white p-4 rounded-xl font-bold shadow-md">+ Adicionar Produto</button>
            <h3 className="font-bold mt-6">Pedidos Recebidos</h3>
            {orders.map(o => (
              <div key={o.id} className="bg-white p-4 rounded-xl border flex justify-between shadow-sm">
                <div className="text-sm"><p className="font-bold">{o.userName}</p><p className="text-gray-500">{o.address}</p></div>
                <div className="text-right">
                  <p className="font-bold text-red-600">R$ {parseFloat(o.total).toFixed(2)}</p>
                  <button onClick={() => deleteDoc(doc(db, 'pedidos', o.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {view === 'client' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-around items-center shadow-lg">
          <button onClick={() => setActiveTab('menu')} className={activeTab === 'menu' ? 'text-red-600' : 'text-gray-400'}><Menu /></button>
          <button onClick={() => setActiveTab('cart')} className={`relative ${activeTab === 'cart' ? 'text-red-600' : 'text-gray-400'}`}>
            <ShoppingBag />
            {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{cart.length}</span>}
          </button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-red-600' : 'text-gray-400'}><User /></button>
        </nav>
      )}
    </div>
  );
}

export default App;

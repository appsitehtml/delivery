import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, addDoc, 
  deleteDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Trash2, Menu as MenuIcon, User 
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
        try { await signInAnonymously(auth); } catch (e) { console.error("Erro Auth:", e); }
      }
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubProducts = onSnapshot(collection(db, 'produtos'), (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOrders = onSnapshot(collection(db, 'pedidos'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data.sort((a, b) => b.createdAt - a.createdAt));
    });

    const profileRef = doc(db, 'usuarios', user.uid);
    getDoc(profileRef).then(docSnap => {
      if (docSnap.exists()) setProfile(docSnap.data());
    });

    return () => { unsubProducts(); unsubOrders(); };
  }, [user]);

  const addToCart = (product) => {
    setCart(prev => [...prev, { ...product, cartId: Math.random() }]);
  };

  const placeOrder = async (method) => {
    if (!profile?.name || !profile?.address) {
      alert("⚠️ Preencha seu perfil antes de pedir.");
      setActiveTab('profile');
      return;
    }

    const total = cart.reduce((acc, item) => acc + item.price, 0);
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
        const msg = encodeURIComponent(`*NOVO PEDIDO*\nCliente: ${profile.name}\nTotal: R$ ${total.toFixed(2)}`);
        window.open(`https://wa.me/5521999999999?text=${msg}`);
      }
      setCart([]);
      alert("✅ Pedido enviado!");
      setActiveTab('menu');
    } catch (err) { alert("Erro: " + err.message); }
  };

  if (loading) return <div className="p-10 text-center">Iniciando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="font-bold text-lg">EletroNit <span className="text-red-600">Pro</span></h1>
        <button onClick={() => setView(view === 'client' ? 'admin' : 'client')} className="text-xs bg-gray-100 px-2 py-1 rounded font-bold">
          {view === 'client' ? 'ADMIN' : 'LOJA'}
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {view === 'client' ? (
          <div>
            {activeTab === 'menu' && (
              <div className="grid gap-3">
                {products.map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
                    <div><p className="font-bold">{p.name}</p><p className="text-red-600">R$ {p.price.toFixed(2)}</p></div>
                    <button onClick={() => addToCart(p)} className="bg-red-600 text-white p-2 rounded-lg"><Plus size={20}/></button>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'cart' && (
              <div className="bg-white p-6 rounded-2xl border">
                <h2 className="font-bold mb-4">Carrinho</h2>
                {cart.map(item => (
                  <div key={item.cartId} className="flex justify-between border-b py-2 text-sm">
                    <span>{item.name}</span><span>R$ {item.price.toFixed(2)}</span>
                  </div>
                ))}
                <button onClick={() => placeOrder('whatsapp')} className="w-full bg-green-500 text-white p-3 rounded-xl mt-4 font-bold">Pedir via WhatsApp</button>
              </div>
            )}
            {activeTab === 'profile' && (
              <div className="bg-white p-6 rounded-2xl border">
                <input className="w-full border p-3 rounded-xl mb-2" placeholder="Nome" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                <textarea className="w-full border p-3 rounded-xl mb-2" placeholder="Endereço" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} />
                <button className="w-full bg-black text-white p-3 rounded-xl" onClick={async () => {
                   await setDoc(doc(db, 'usuarios', user.uid), profile);
                   alert("Salvo!");
                   setActiveTab('menu');
                }}>Salvar Perfil</button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => {
              const n = prompt("Nome:");
              const p = prompt("Preço:");
              if(n && p) addDoc(collection(db, 'produtos'), { name: n, price: parseFloat(p) });
            }} className="w-full bg-gray-900 text-white p-3 rounded-xl">+ Novo Produto</button>
            {orders.map(o => (
              <div key={o.id} className="bg-white p-4 rounded-xl border flex justify-between shadow-sm">
                <div><p className="font-bold">{o.userName}</p><p className="text-xs text-gray-500">{o.address}</p></div>
                <div className="text-right">
                  <p className="font-bold text-red-600">R$ {o.total.toFixed(2)}</p>
                  <button onClick={() => deleteDoc(doc(db, 'pedidos', o.id))}><Trash2 size={16} className="text-gray-300" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {view === 'client' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex justify-around">
          <button onClick={() => setActiveTab('menu')} className={activeTab === 'menu' ? 'text-red-600' : 'text-gray-400'}><MenuIcon /></button>
          <button onClick={() => setActiveTab('cart')} className={activeTab === 'cart' ? 'text-red-600' : 'text-gray-400'}><ShoppingBag /></button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-red-600' : 'text-gray-400'}><User /></button>
        </nav>
      )}
    </div>
  );
}

export default App;

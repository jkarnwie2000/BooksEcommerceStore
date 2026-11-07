import Nav from "./components/Nav";
import React, { useState, useEffect  } from "react";
import Footer from "./components/Footer";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from "./pages/Home";
import Books from "./pages/Books";
import { books } from "./data";
import BookInfo from "./pages/BookInfo"
import Cart from "./pages/Cart";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Admin from "./pages/Admin";

const CART_KEY = "cart";

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}


function App() {
    const [cart, setCart] = useState(loadCart);  
    function addToCart(book) {
      setCart([...cart, { ...book, quantity: 1 }])
    }

    function changeQuantity(book, quantity) {
      setCart(cart.map(item => item.id === book.id
      ?  {           
          ...item,
          quantity: +quantity,
        }
        : item      
      )
    );
    }

    function removeItem(item) {
      setCart(cart.filter(book => book.id !== item.id))
      console.log('removeItem', item)
    }

    function numberOfItems() {
      let counter = 0;
      cart.forEach(item => {
        counter += item.quantity
      })
      return counter;
    }

    function clearCart() {
      setCart([])
    }

    // Keep the cart across page loads so it survives the trip to Stripe Checkout.
    useEffect(() => {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart))
      } catch {
        // Storage unavailable; the cart just won't persist.
      }
    }, [cart])

    return (
      <Router>
      <div className="App">    
      <Nav numberOfItems={numberOfItems()} />
      <Routes>
      <Route path="/" exact element={<Home books={books}/>} />
      <Route path="/books" exact element={<Books books={books} />} />
      <Route path="/books/:id" element={<BookInfo books={books} addToCart={addToCart} cart={cart}/>} />
      <Route path="/cart" element={<Cart books={books} cart={cart} changeQuantity={changeQuantity} removeItem={removeItem} />} />
      <Route path="/checkout/success" element={<CheckoutSuccess clearCart={clearCart} />} />
      <Route path="/admin" element={<Admin books={books} />} />
      </Routes>
      <Footer />
      </div>
      </Router>
  );
}

export default App;
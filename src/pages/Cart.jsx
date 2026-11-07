import React, { useState } from "react";
import { Link } from "react-router-dom";


const Cart = ({ cart, changeQuantity, removeItem }) => {
const [checkingOut, setCheckingOut] = useState(false);
const [checkoutError, setCheckoutError] = useState("");

async function checkout() {
    setCheckingOut(true);
    setCheckoutError("");
    try {
        const response = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
            }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) {
            throw new Error(data.error || "Could not start checkout.");
        }
        window.location.assign(data.url);
    } catch (err) {
        setCheckoutError(err.message);
        setCheckingOut(false);
    }
}

const total = () => {
let price = 0;
cart.forEach((item) => {
price += +((item.salePrice || item.originalPrice) * item.quantity 
).toFixed(2);  
});
 return price;
}
return (
<div id="books__body">
    <main id="books__main">
        <div className="books__container">
            <div className="row">
                <div className="book__selected--top">
                    <h2 className="cart__title">Cart</h2>
                </div>
                <div className="cart">
                    <div className="cart__header">
                        <span className="cart__book">Book</span>
                        <span className="cart__quantity">Quantity</span>
                        <span className="cart__total">Price</span>
                    </div>
                    <div className="cart__body">
                        {
                            cart.map((book) => {
                              return (
                                <div className="cart__item" key={book.id}>
                                <div className="cart__book">
                                <img 
                                src= {book.url}
                                className="cart__book--img" 
                                alt="" />
                                <div className="cart__book--info">
                                    <span className="cart__book--title">
                                        {book.title}
                                    </span>
                                    <span className="cart__book--price">
                                        ${(book.salePrice || book.originalPrice).toFixed(2)}
                                    </span>
                                    <button className="cart__book--remove" onClick={() => removeItem(book)}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                            <div className="cart__quantity">
                                <input type="number" 
                                min={0} 
                                max={99} 
                                className="cart__input"
                                value={book.quantity}
                                onChange={(event) => changeQuantity(book, event.target.value)}
                                />
                            </div>
                            <div className="cart__total">
                                ${((book.salePrice || book.originalPrice) * book.quantity).toFixed(2)}
                            </div>
                        </div>
                              );
                            })}                        
                    </div>
                    
                    {
                    cart.length === 0 && (
                    <div className="cart__empty">
                        <img src="/assets/empty_cart.svg" alt="" className="cart__empty--img"/>
                        <h2>You don't have any books in your cart!</h2>
                        <Link to="/books">
                        <button className="btn">Browse books</button>
                        </Link>
                    </div>                            
                    )}
                </div>
                {cart.length > 0 && (<div className="total">
                    <div className="total__item total__sub-total">
                        <span>Subtotal</span>
                        <span>${(total() * 0.9).toFixed(2)}</span>
                    </div>
                    <div className="total__item total__tax">
                        <span>Tax</span>
                        <span>${(total() * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="total__item total__price">
                        <span>Total</span>
                        <span>${total().toFixed(2)}</span>
                    </div>
                    <button className="btn btn__checkout"
                    onClick={checkout}
                    disabled={checkingOut || numberOfBooks(cart) === 0}>
                        {checkingOut ? "Redirecting to Stripe..." : "Proceed to checkout"}
                    </button>
                    {checkoutError && (
                        <p className="checkout__error" role="alert">{checkoutError}</p>
                    )}
                    <p className="checkout__secure">Payments are processed securely by Stripe.</p>
                </div>)}
            </div>
        </div>
    </main>
</div>
    )
}

function numberOfBooks(cart) {
    return cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export default Cart;
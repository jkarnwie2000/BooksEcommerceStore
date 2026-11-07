import React, { useEffect } from "react";
import { Link } from "react-router-dom";

const CheckoutSuccess = ({ clearCart }) => {
  useEffect(() => {
    clearCart();
    // Only clear once, when the shopper lands here from Stripe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="books__body">
      <main id="books__main">
        <div className="books__container">
          <div className="row">
            <div className="checkout__success">
              <img src="/assets/Undraw_Books.svg" alt="" className="checkout__success--img" />
              <h2>Thank you for your order!</h2>
              <p>Your payment was successful. A receipt is on its way to your email.</p>
              <Link to="/books">
                <button className="btn">Keep browsing</button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccess;

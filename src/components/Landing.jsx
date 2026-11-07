import React from "react";

const Landing = () => {
    function scrollToDiscounted(event) {
        event.preventDefault();
        document.getElementById("recent")?.scrollIntoView({ behavior: "smooth" });
    }

    return (
        <section id="landing">
            <header>
             <div className="header__container">
             <div className="header__description">
            <h1>Liberia's most awarded online library platform</h1>
            <h2>Find your dream book with Julius Gold's online <span className="purple">library</span></h2>
            <a href="#recent" className="btn" onClick={scrollToDiscounted}>
            Browse books
            </a>
            </div>
            <figure className="header__img--wrapper">
            <img src="/assets/Undraw_Books.svg" alt="" />
            </figure>  
            </div>             
            </header>
        </section>
    )
}

export default Landing
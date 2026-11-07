import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faGithub,
    faLinkedin,
    faXTwitter,
    faInstagram,
} from "@fortawesome/free-brands-svg-icons";

// Update these URLs to point at your own profiles.
export const socialLinks = [
    { name: "GitHub", url: "https://github.com/jkarnwie2000", icon: faGithub },
    { name: "LinkedIn", url: "https://www.linkedin.com/", icon: faLinkedin },
    { name: "X", url: "https://x.com/", icon: faXTwitter },
    { name: "Instagram", url: "https://www.instagram.com/", icon: faInstagram },
];

// Takes the visitor to the top of the page the link opens (also works when
// they're already on that page, where a plain link wouldn't scroll).
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

const Footer = () => {
    return (
        <footer>
            <div className="container">
                <div className="row row__column">
                    <Link to="/" className="footer__logo">
                        <figure>
                            <img src="/assets/Library.svg" className="footer__logo--img" alt="" />
                        </figure>
                    </Link>
                    <div className="footer__list">
                        <Link to="/" className="footer__link" onClick={scrollToTop}>Home</Link>
                        <Link to="/" className="footer__link" onClick={scrollToTop}>About</Link>
                        <Link to="/books" className="footer__link">Books</Link>
                        <Link to="/cart" className="footer__link" onClick={scrollToTop}>Cart</Link>
                        <Link to="/admin" className="footer__link">Admin</Link>
                    </div>
                    <ul className="footer__social">
                        {socialLinks.map((social) => (
                            <li key={social.name}>
                                <a
                                    href={social.url}
                                    className="footer__social--link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                >
                                    <FontAwesomeIcon icon={social.icon} />
                                </a>
                            </li>
                        ))}
                    </ul>
                    <div className="footer__copyright">
                        Copyright &copy; 2026 Julius Gold's Library
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer

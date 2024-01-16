import type {ReactElement} from 'react';
import React, {useCallback} from 'react';

import {ActionButton, BackPage, Console, Form} from 'backpage';

const page = new BackPage();

const App = (): ReactElement => {
  const action = useCallback(() => {
    console.info('action');
  }, []);

  const anotherAction = useCallback(() => {
    console.info('another action');
  }, []);

  const search = useCallback(({query}: {query: string}) => {
    console.info('search', query);
  }, []);

  return (
    <>
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        rel="stylesheet"
      />

      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <a className="navbar-brand" href="#">
            Navbar
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <ActionButton className="nav-link" action={action}>
                  Action
                </ActionButton>
              </li>
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle"
                  href="#"
                  id="navbarDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                >
                  Dropdown
                </a>
                <ul className="dropdown-menu">
                  <li>
                    <ActionButton
                      className="dropdown-item"
                      action={anotherAction}
                    >
                      Another action
                    </ActionButton>
                  </li>
                </ul>
              </li>
            </ul>
            <Form className="d-flex" role="search" action={search}>
              <input
                className="form-control me-2"
                name="query"
                type="search"
                placeholder="Search"
              />
              <button className="btn btn-outline-success" type="submit">
                Search
              </button>
            </Form>
          </div>
        </div>
      </nav>

      <div className="container my-5">
        <h1>Hello, world!</h1>
        <Console />
      </div>

      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" />
    </>
  );
};

page.render(<App />);

page.guide();

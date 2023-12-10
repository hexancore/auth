# OpenID Connect

Jako w pełni zgodna implementacja dostawcy OpenID Connect, Keycloak udostępnia zestaw punktów końcowych, których aplikacje i usługi mogą używać do uwierzytelniania i autoryzacji swoich użytkowników.
W tej sekcji opisano niektóre kluczowe punkty końcowe, których aplikacja i usługa powinny używać podczas interakcji z Keycloak.

## Endpointy

### Konfiguracja i lista endpointów
```
/realms/{nazwa-obszaru}/.well-known/openid-configuration
```

### Autoryzacja
// TODO opcje
```
/realms/{nazwa-obszaru}/protocol/openid-connect/auth
```

### Token
Do uzyskiwania tokenów i odświeżania ich
```
/realms/{nazwa-obszaru}/protocol/openid-connect/token
```

### Informacje o użytkowniku
Dostępny pod podaniu tokenu
```
/realms/{nazwa-obszaru}/protocol/openid-connect/userinfo
```

### Wylogowanie
Trzeba dać refresh_token
```
/realms/{nazwa-obszaru}/protocol/openid-connect/logout
```

### Certyfikat, JWK
```
/realms/{nazwa-obszaru}/protocol/openid-connect/certs
```

### Sprawdzanie poprawności tokenu
```
/realms/{nazwa-obszaru}/protocol/openid-connect/token/introspect
```

### Dynamiczna rejestracja klientów
```
/realms/{nazwa-obszaru}/clients-registrations/openid-connect
```

### Unieważnienie tokenu
Można access lub refresh

```
/realms/{nazwa-obszaru}/protocol/openid-connect/revoke
```

### Autoryzacja urządzenia
```
/realms/{nazwa-obszaru}/protocol/openid-connect/auth/device
```

### Uwierzytelnienie kanału zwrotnego
Uwierzytelniania kanału zwrotnego służy do uzyskania auth_req_id, który identyfikuje żądanie uwierzytelnienia wysłane przez klienta.

/realms/{nazwa-obszaru}/protocol/openid-connect/ext/ciba/auth

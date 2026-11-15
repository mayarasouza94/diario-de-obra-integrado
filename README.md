# Do diário de obra ao cronograma

**English.** From the site daily report to the schedule. Demonstration of a layer that connects the site daily report to the planner's schedule: field progress feeds planning, and an assisted review proposes resequencing and time buffers using real weather data, Monte Carlo simulation and fuzzy logic. Fictitious project. [Open the live page](https://mayarasouza94.github.io/diario-de-obra-integrado/).

Demonstração de Mayara Souza: uma camada que liga o diário de obra ao cronograma do planejador e uma revisão
assistida que propõe a reprogramação e os bolsões de folga. O cronograma continua sendo feito no programa de
cronograma do planejador; a ferramenta recebe a programação da semana, devolve o avanço lançado pelo campo e
calcula a proposta de revisão.

A página é uma animação de um minuto, em seis etapas, com os números do cálculo real:

1. O cronograma do planejador.
2. A programação da semana vai para o diário de obra, com as restrições de cada atividade.
3. O campo lança o dia: avanço, efetivo e ocorrências. Chuva e vento do dia entram da série meteorológica.
4. A revisão assistida calcula: ritmo medido por disciplina, chance de dia perdido por chuva e por vento nas
   semanas à frente, simulação de Monte Carlo da data de término e lógica fuzzy para repartir o pulmão.
5. A proposta de revisão, item por item, com o motivo.
6. As mudanças aceitas voltam para o cronograma.

## Dados

A obra é fictícia ("Obra A", construção de um data center). O entorno é real: chuva e rajada diárias por reanálise
ERA5 no ponto da obra, na região de Campinas (SP), com dez anos de série para a climatologia por semana do ano; e
pessoal ocupado em construção nos municípios da região, do IBGE (Cadastro Central de Empresas). Atividades,
durações, custos, efetivos e riscos são ilustrativos.

## Cálculo

Todo o cálculo está em `motor.js`: caminho crítico e folga total, linha de base congelada, medição pelo diário,
previsão por Monte Carlo sobre a rede de atividades, lógica fuzzy com nove regras e climatologia semanal. A rede
tem só ligações término-início, sem calendário de dias úteis e sem restrição de recurso.

## Execução local

Página estática, sem etapa de build. Servir a pasta por HTTP:

```
python -m http.server 8060
```

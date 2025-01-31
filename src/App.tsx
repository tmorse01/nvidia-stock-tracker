import "@mantine/core/styles.css";
import { MantineProvider, Container } from "@mantine/core";
import { theme } from "./theme";
import { NvidiaStockChart } from "./components/NvidiaStockChart";

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <Container size="lg" py="xl">
        <NvidiaStockChart />
      </Container>
    </MantineProvider>
  );
}
